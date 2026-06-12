"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_ROUTES } from "@/lib/types/database";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid email or password format" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .single();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: "Your account has been deactivated" };
  }

  redirect(ROLE_ROUTES[profile.role as keyof typeof ROLE_ROUTES] ?? "/patient");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const inviteAcceptSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});

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

  const { data: invite } = await supabase
    .from("staff_invites")
    .select("*")
    .eq("token", parsed.data.token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!invite) {
    return { error: "Invalid or expired invite" };
  }

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

  const userId = authData.user?.id;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Authentication failed" };
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
