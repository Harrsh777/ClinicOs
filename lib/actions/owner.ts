"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createStaffAccount } from "@/lib/clinic/provision";
import { activationUrl } from "@/lib/auth/activation";
import { sendEmail } from "@/lib/email/send";
import { staffActivationEmail, staffInviteEmail } from "@/lib/email/templates";
import { logAuditEvent } from "@/lib/auth/audit";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "doctor",
    "receptionist",
    "finance_manager",
    "nurse",
    "pharmacist",
    "lab_technician",
    "hr",
    "administrator",
  ]),
  moduleKeys: z.array(z.string()),
});

const CLINIC_ADMIN_ROLES = ["clinic_owner", "administrator"] as const;

export async function inviteStaffAction(formData: FormData) {
  const profile = await requireRole([...CLINIC_ADMIN_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const moduleKeys = formData.getAll("moduleKeys") as string[];
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    moduleKeys,
  });

  if (!parsed.success) return { error: "Invalid invite data" };

  const supabase = await createClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, clinic_code")
    .eq("id", profile.clinic_id)
    .single();
  if (!clinic?.clinic_code) return { error: "Clinic not configured" };

  const token = crypto.randomUUID().replace(/-/g, "");

  const { error } = await supabase.from("staff_invites").insert({
    clinic_id: profile.clinic_id,
    email: parsed.data.email,
    role: parsed.data.role,
    invited_by: profile.id,
    token,
    module_keys: parsed.data.moduleKeys,
  });

  if (error) return { error: error.message };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const inviteUrl = `${baseUrl}/invite/${token}`;
  const emailResult = await sendEmail({
    to: parsed.data.email,
    subject: `${clinic.name} invited you to ClinicOS`,
    html: staffInviteEmail({
      clinicName: clinic.name,
      clinicCode: clinic.clinic_code,
      role: parsed.data.role,
      inviteUrl,
    }),
  });

  revalidatePath("/owner/staff");
  revalidatePath("/administrator/staff");
  return { success: true, inviteUrl, emailSent: emailResult.ok };
}

const createStaffSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  phone: z.string().min(10).max(15).optional(),
  departmentId: z.string().uuid().optional(),
  role: z.enum([
    "doctor",
    "receptionist",
    "finance_manager",
    "nurse",
    "pharmacist",
    "lab_technician",
    "hr",
    "administrator",
  ]),
  sendEmail: z.coerce.boolean().optional(),
});

export async function createStaffAccountAction(formData: FormData) {
  const profile = await requireRole([...CLINIC_ADMIN_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const moduleKeys = formData.getAll("moduleKeys") as string[];
  const parsed = createStaffSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || undefined,
    departmentId: formData.get("departmentId") || undefined,
    role: formData.get("role"),
    sendEmail: formData.get("sendEmail") === "on" || formData.get("sendEmail") === "true",
  });

  if (!parsed.success) return { error: "Invalid staff details" };

  const supabase = await createClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, clinic_code")
    .eq("id", profile.clinic_id)
    .single();

  if (!clinic?.clinic_code) return { error: "Clinic not configured" };

  const result = await createStaffAccount({
    clinicId: profile.clinic_id,
    clinicCode: clinic.clinic_code,
    clinicName: clinic.name,
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    role: parsed.data.role,
    departmentId: parsed.data.departmentId,
    moduleKeys,
    grantedBy: profile.id,
  });

  if ("error" in result && result.error) return { error: result.error };

  let emailSent = false;
  let activationLink: string | undefined;
  if (parsed.data.sendEmail !== false) {
    activationLink = activationUrl(result.activationToken!);
    const emailResult = await sendEmail({
      to: result.email!,
      subject: `MedERP — Activate your ${clinic.name} account`,
      html: staffActivationEmail({
        staffName: result.fullName!,
        clinicName: result.clinicName!,
        clinicCode: result.clinicCode!,
        staffCode: result.staffCode!,
        role: result.role!,
        activationUrl: activationLink,
      }),
    });
    emailSent = emailResult.ok;
  }

  await logAuditEvent({
    clinicId: profile.clinic_id,
    actorId: profile.id,
    action: "staff.created",
    entityType: "profile",
    entityId: result.userId,
    metadata: { role: result.role, staff_code: result.staffCode },
  });

  revalidatePath("/owner/staff");
  return {
    success: true,
    emailSent,
    staff: {
      clinicCode: result.clinicCode,
      staffCode: result.staffCode,
      email: result.email,
      role: result.role,
      activationUrl: emailSent ? undefined : activationLink,
    },
  };
}

export async function getPendingInvites(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_invites")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function revokeStaffInviteAction(inviteId: string) {
  const profile = await requireRole([...CLINIC_ADMIN_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("clinic_id", profile.clinic_id)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidatePath("/owner/staff");
  return { success: true };
}

export async function resendStaffInviteAction(inviteId: string) {
  const profile = await requireRole([...CLINIC_ADMIN_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { data: invite } = await supabase
    .from("staff_invites")
    .select("token, email, role, clinics(name, clinic_code)")
    .eq("id", inviteId)
    .eq("clinic_id", profile.clinic_id)
    .eq("status", "pending")
    .single();

  if (!invite) return { error: "Invite not found" };

  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 7);
  await supabase
    .from("staff_invites")
    .update({ expires_at: newExpiry.toISOString() })
    .eq("id", inviteId);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const inviteUrl = `${baseUrl}/invite/${invite.token}`;
  const clinic = invite.clinics as { name?: string; clinic_code?: string } | null;
  const emailResult = await sendEmail({
    to: invite.email,
    subject: `${clinic?.name ?? "Your clinic"} invited you to ClinicOS`,
    html: staffInviteEmail({
      clinicName: clinic?.name ?? "Your clinic",
      clinicCode: clinic?.clinic_code ?? "",
      role: invite.role,
      inviteUrl,
    }),
  });

  return { success: true, inviteUrl, emailSent: emailResult.ok };
}

export async function updateStaffPermissionsAction(
  staffId: string,
  permissions: { moduleKey: string; level: "read" | "write" | "admin" }[]
) {
  const profile = await requireRole([...CLINIC_ADMIN_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();

  const { data: staffMember } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", staffId)
    .eq("clinic_id", profile.clinic_id)
    .single();

  if (!staffMember) return { error: "Staff member not found" };
  if (staffMember.role === "clinic_owner") return { error: "Cannot modify owner permissions" };

  await supabase
    .from("staff_module_permissions")
    .delete()
    .eq("profile_id", staffId)
    .eq("clinic_id", profile.clinic_id);

  if (permissions.length > 0) {
    const rows = permissions.map((p) => ({
      profile_id: staffId,
      clinic_id: profile.clinic_id!,
      module_key: p.moduleKey,
      permission_level: p.level,
      granted_by: profile.id,
    }));
    const { error } = await supabase.from("staff_module_permissions").insert(rows);
    if (error) return { error: error.message };
  }

  await logAuditEvent({
    clinicId: profile.clinic_id,
    actorId: profile.id,
    action: "staff.permissions_updated",
    entityType: "profile",
    entityId: staffId,
    metadata: { permissions },
  });

  revalidatePath("/owner/permissions");
  return { success: true };
}

export async function deactivateStaffAction(staffId: string) {
  const profile = await requireRole([...CLINIC_ADMIN_ROLES]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", staffId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };

  if (profile.clinic_id) {
    await logAuditEvent({
      clinicId: profile.clinic_id,
      actorId: profile.id,
      action: "staff.deactivated",
      entityType: "profile",
      entityId: staffId,
    });
  }

  revalidatePath("/owner/staff");
  return { success: true };
}

export async function transferStaffRoleAction(staffId: string, newRole: string) {
  const profile = await requireRole([...CLINIC_ADMIN_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const validRoles = [
    "doctor",
    "receptionist",
    "finance_manager",
    "nurse",
    "pharmacist",
    "lab_technician",
    "hr",
    "administrator",
  ];
  if (!validRoles.includes(newRole)) return { error: "Invalid role" };

  const service = await createServiceClient();
  const { data: staff } = await service
    .from("profiles")
    .select("id, role")
    .eq("id", staffId)
    .eq("clinic_id", profile.clinic_id)
    .single();

  if (!staff) return { error: "Staff member not found" };

  const { data: newCode } = await service.rpc("generate_staff_code", {
    p_clinic_id: profile.clinic_id,
    p_role: newRole,
  });

  await service
    .from("profiles")
    .update({ role: newRole, staff_code: newCode as string })
    .eq("id", staffId);

  await service
    .from("staff_module_permissions")
    .delete()
    .eq("profile_id", staffId)
    .eq("clinic_id", profile.clinic_id);

  await logAuditEvent({
    clinicId: profile.clinic_id,
    actorId: profile.id,
    action: "staff.role_transferred",
    entityType: "profile",
    entityId: staffId,
    metadata: { from_role: staff.role, to_role: newRole, new_staff_code: newCode },
  });

  revalidatePath("/owner/staff");
  return { success: true, staffCode: newCode };
}

export async function getClinicDepartments(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

const settingsSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  consultationFee: z.coerce.number().min(0),
  emergencyFee: z.coerce.number().min(0).optional(),
});

export async function updateClinicSettingsAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    consultationFee: formData.get("consultationFee"),
    emergencyFee: formData.get("emergencyFee") || undefined,
  });

  if (!parsed.success) return { error: "Invalid settings" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("clinics")
    .select("settings")
    .eq("id", profile.clinic_id)
    .single();

  const settings = { ...((existing?.settings ?? {}) as Record<string, unknown>) };
  const fees = { ...((settings.fees ?? {}) as Record<string, unknown>) };
  if (parsed.data.emergencyFee != null) {
    fees.emergency = parsed.data.emergencyFee;
  }
  settings.fees = fees;

  const { error } = await supabase
    .from("clinics")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address,
      consultation_fee_default: parsed.data.consultationFee,
      settings,
    })
    .eq("id", profile.clinic_id);

  if (error) return { error: error.message };
  revalidatePath("/owner/settings");
  return { success: true };
}

export async function getClinicStaff(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*, staff_module_permissions(module_key, permission_level), departments(name)")
    .eq("clinic_id", clinicId)
    .neq("role", "clinic_owner")
    .order("created_at", { ascending: false });
  return data ?? [];
}
