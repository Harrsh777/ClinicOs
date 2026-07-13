"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { validateClinicLogin } from "@/lib/auth/clinic-login";
import { resolveLoginProfile } from "@/lib/auth/profile";
import { resolveStaffLoginEmail } from "@/lib/auth/resolve-staff-login";
import {
  checkAccountLocked,
  clearFailedLogins,
  recordFailedLogin,
} from "@/lib/auth/login-lockout";
import {
  validateActivationToken,
  markActivationTokenUsed,
} from "@/lib/auth/activation";
import { logAuditEvent } from "@/lib/auth/audit";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ROLE_ROUTES } from "@/lib/types/database";
import { z } from "zod";

const staffLoginSchema = z.object({
  clinicId: z.string().min(1, "Clinic ID is required"),
  staffId: z.string().min(1, "Email is required"),
  password: z.string().min(6),
});

const adminLoginSchema = z.object({
  clinicId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function loginAction(formData: FormData) {
  const clinicId = String(formData.get("clinicId") ?? "");
  const isPlatformAdmin = clinicId.trim().toUpperCase() === "PLATFORM";

  if (isPlatformAdmin) {
    const parsed = adminLoginSchema.safeParse({
      clinicId,
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) return { error: "Invalid credentials format" };
    return loginWithEmail(parsed.data.clinicId, parsed.data.email, parsed.data.password);
  }

  const parsed = staffLoginSchema.safeParse({
    clinicId,
    staffId: formData.get("staffId") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid login credentials format" };
  }

  const resolved = await resolveStaffLoginEmail(
    parsed.data.clinicId,
    parsed.data.staffId.trim()
  );
  if (!resolved.ok) return { error: resolved.error };

  const lockCheck = await checkAccountLocked(resolved.profileId);
  if (lockCheck.locked) return { error: lockCheck.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: resolved.email,
    password: parsed.data.password,
  });

  if (error) {
    await recordFailedLogin(resolved.profileId);
    return { error: "Invalid Clinic ID, email, or password" };
  }

  return finalizeLogin(parsed.data.clinicId, resolved.profileId, resolved.clinicId);
}

async function loginWithEmail(clinicId: string, email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication failed" };

  const service = await createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id, clinic_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.id) {
    const lockCheck = await checkAccountLocked(profile.id);
    if (lockCheck.locked) {
      await supabase.auth.signOut();
      return { error: lockCheck.message };
    }
  }

  return finalizeLogin(clinicId, profile?.id, profile?.clinic_id ?? null);
}

async function finalizeLogin(
  clinicIdInput: string,
  profileId?: string,
  knownClinicId?: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Authentication failed" };

  const { profile, reason, clinicId: profileClinicId } = await resolveLoginProfile(user);

  if (!profile) {
    await supabase.auth.signOut();
    if (reason === "deactivated") {
      return { error: "Your account has been deactivated. Contact your clinic administrator." };
    }
    return { error: "Profile not found. Contact support." };
  }

  const clinicCheck = await validateClinicLogin(
    clinicIdInput,
    user.id,
    profile.role,
    profileClinicId ?? null
  );
  if (!clinicCheck.ok) {
    await supabase.auth.signOut();
    return { error: clinicCheck.error };
  }

  if (profileId) {
    await clearFailedLogins(profileId);
  }

  const service = await createServiceClient();
  const hdrs = await headers();
  const sessionToken = crypto.randomUUID();
  await service.from("user_sessions").insert({
    profile_id: user.id,
    clinic_id: knownClinicId ?? profileClinicId,
    session_token: sessionToken,
    ip_address: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: hdrs.get("user-agent"),
    device_label: hdrs.get("user-agent")?.slice(0, 80) ?? "Unknown device",
  });

  if (profileClinicId && profile.role !== "super_admin") {
    await logAuditEvent({
      clinicId: profileClinicId,
      actorId: user.id,
      action: "user.login",
      entityType: "profile",
      entityId: user.id,
    });
  }

  const { data: fullProfile } = await service
    .from("profiles")
    .select("first_login, role, clinic_id")
    .eq("id", user.id)
    .single();

  if (fullProfile?.role === "clinic_owner" && fullProfile.first_login) {
    redirect("/owner/change-password");
  }

  if (fullProfile?.role === "clinic_owner" && fullProfile.clinic_id) {
    const { data: clinic } = await service
      .from("clinics")
      .select("clinic_setup_completed")
      .eq("id", fullProfile.clinic_id)
      .single();

    if (clinic && !clinic.clinic_setup_completed) {
      redirect("/owner/onboarding");
    }
  }

  redirect(ROLE_ROUTES[profile.role as keyof typeof ROLE_ROUTES] ?? "/patient");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function clearBrokenSessionAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true };
}

const activateSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
});

export async function activateAccountAction(formData: FormData) {
  const parsed = activateSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) return { error: "Please enter a valid password (min 8 characters)" };
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const validation = await validateActivationToken(parsed.data.token);
  if ("error" in validation) return { error: validation.error };

  const service = await createServiceClient();
  const { error: pwError } = await service.auth.admin.updateUserById(validation.profileId, {
    password: parsed.data.password,
  });

  if (pwError) return { error: pwError.message };

  await service
    .from("profiles")
    .update({ first_login: false })
    .eq("id", validation.profileId);

  await markActivationTokenUsed(validation.tokenId);

  if (validation.clinicId) {
    await logAuditEvent({
      clinicId: validation.clinicId,
      actorId: validation.profileId,
      action: "user.activated",
      entityType: "profile",
      entityId: validation.profileId,
    });
  }

  return {
    success: true,
    clinicCode: validation.clinicCode,
    staffCode: validation.staffCode,
  };
}

const forgotPasswordSchema = z.object({
  clinicId: z.string().min(1),
  staffId: z.string().min(1),
  email: z.string().email(),
});

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({
    clinicId: formData.get("clinicId"),
    staffId: formData.get("staffId"),
    email: formData.get("email"),
  });

  if (!parsed.success) return { error: "Invalid form data" };

  const resolved = await resolveStaffLoginEmail(parsed.data.clinicId, parsed.data.staffId);
  if (!resolved.ok) {
    return { success: true };
  }

  if (resolved.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return { success: true };
  }

  const service = await createServiceClient();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  await service.from("password_resets").insert({
    profile_id: resolved.profileId,
    clinic_id: resolved.clinicId,
    token,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  const { data: profile } = await service
    .from("profiles")
    .select("full_name, staff_code")
    .eq("id", resolved.profileId)
    .single();

  const { data: clinic } = await service
    .from("clinics")
    .select("clinic_code")
    .eq("id", resolved.clinicId)
    .single();

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { sendEmail } = await import("@/lib/email/send");
  const { passwordResetEmail } = await import("@/lib/email/templates");

  await sendEmail({
    to: resolved.email,
    subject: "MedERP — Password reset",
    html: passwordResetEmail({
      name: profile?.full_name ?? "User",
      clinicCode: clinic?.clinic_code ?? parsed.data.clinicId,
      staffCode: profile?.staff_code ?? parsed.data.staffId,
      resetUrl: `${base}/reset-password/${token}`,
    }),
  });

  return { success: true };
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== confirmPassword) return { error: "Passwords do not match" };

  const service = await createServiceClient();
  const { data: reset } = await service
    .from("password_resets")
    .select("*")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!reset) return { error: "Invalid or expired reset link" };

  const { error } = await service.auth.admin.updateUserById(reset.profile_id, { password });
  if (error) return { error: error.message };

  await service
    .from("password_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("id", reset.id);

  await clearFailedLogins(reset.profile_id);

  return { success: true };
}

const inviteAcceptSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

export async function changePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== confirmPassword) return { error: "Passwords do not match" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const service = await createServiceClient();
  const { error } = await service.auth.admin.updateUserById(user.id, { password });
  if (error) return { error: error.message };

  await service.from("profiles").update({ first_login: false }).eq("id", user.id);

  const { data: profile } = await service
    .from("profiles")
    .select("role, clinic_id")
    .eq("id", user.id)
    .single();

  if (profile?.role === "clinic_owner") {
    redirect("/owner/onboarding");
  }

  redirect(ROLE_ROUTES[profile?.role as keyof typeof ROLE_ROUTES] ?? "/login");
}

export async function acceptInviteAction(formData: FormData) {
  const parsed = inviteAcceptSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { error: "Please fill all fields correctly" };
  }

  const supabase = await createClient();
  const { createServiceClient } = await import("@/lib/supabase/server");
  const service = await createServiceClient();

  const { data: invite } = await service
    .from("staff_invites")
    .select("*")
    .eq("token", parsed.data.token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!invite) {
    return { error: "Invalid or expired invite" };
  }

  const staffCode = await service.rpc("generate_staff_code", {
    p_clinic_id: invite.clinic_id,
    p_role: invite.role,
  });

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: invite.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, role: invite.role },
    },
  });

  if (signUpError || !authData.user) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password: parsed.data.password,
    });
    if (signInError) return { error: signUpError?.message ?? "Failed to create account" };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication failed" };

  await supabase
    .from("profiles")
    .update({
      role: invite.role,
      clinic_id: invite.clinic_id,
      full_name: parsed.data.fullName,
      email: invite.email,
      staff_code: staffCode.data as string,
      first_login: false,
    })
    .eq("id", user.id);

  if (invite.role === "doctor") {
    await supabase.from("doctors").insert({
      profile_id: user.id,
      clinic_id: invite.clinic_id,
    });
  }

  const moduleKeys = invite.module_keys as string[];
  if (moduleKeys?.length > 0) {
    const perms = moduleKeys.map((key) => ({
      profile_id: user.id,
      clinic_id: invite.clinic_id,
      module_key: key,
      permission_level: "write" as const,
      granted_by: invite.invited_by,
    }));
    await supabase.from("staff_module_permissions").upsert(perms, {
      onConflict: "profile_id,module_key",
    });
  }

  await supabase
    .from("staff_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  redirect(ROLE_ROUTES[invite.role as keyof typeof ROLE_ROUTES] ?? "/login");
}
