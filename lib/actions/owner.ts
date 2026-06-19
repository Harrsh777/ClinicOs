"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createStaffAccount } from "@/lib/clinic/provision";
import { sendEmail } from "@/lib/email/send";
import { staffCredentialsEmail } from "@/lib/email/templates";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["doctor", "receptionist", "finance_manager"]),
  moduleKeys: z.array(z.string()),
});

export async function inviteStaffAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const moduleKeys = formData.getAll("moduleKeys") as string[];
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    moduleKeys,
  });

  if (!parsed.success) return { error: "Invalid invite data" };

  const supabase = await createClient();
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

  revalidatePath("/owner/staff");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const inviteUrl = `${baseUrl}/invite/${token}`;
  return { success: true, inviteUrl };
}

const createStaffSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(["doctor", "receptionist", "finance_manager"]),
  password: z.string().min(8).optional(),
  sendEmail: z.coerce.boolean().optional(),
});

export async function createStaffAccountAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const moduleKeys = formData.getAll("moduleKeys") as string[];
  const parsed = createStaffSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    password: formData.get("password") || undefined,
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
    role: parsed.data.role,
    password: parsed.data.password,
    moduleKeys,
    grantedBy: profile.id,
  });

  if ("error" in result && result.error) return { error: result.error };

  let emailSent = false;
  if (parsed.data.sendEmail !== false) {
    const emailResult = await sendEmail({
      to: result.email!,
      subject: `ClinicOS — Your ${clinic.name} account`,
      html: staffCredentialsEmail({
        staffName: result.fullName!,
        clinicName: result.clinicName!,
        clinicCode: result.clinicCode!,
        email: result.email!,
        password: result.password!,
        role: result.role!,
      }),
    });
    emailSent = emailResult.ok;
  }

  revalidatePath("/owner/staff");
  return {
    success: true,
    emailSent,
    credentials: {
      clinicCode: result.clinicCode,
      email: result.email,
      password: result.password,
      role: result.role,
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
  const profile = await requireRole(["clinic_owner"]);
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
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { data: invite } = await supabase
    .from("staff_invites")
    .select("token")
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
  return { success: true, inviteUrl: `${baseUrl}/invite/${invite.token}` };
}

export async function updateStaffPermissionsAction(
  staffId: string,
  permissions: { moduleKey: string; level: "read" | "write" | "admin" }[]
) {
  const profile = await requireRole(["clinic_owner"]);
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

  revalidatePath("/owner/permissions");
  return { success: true };
}

export async function deactivateStaffAction(staffId: string) {
  const profile = await requireRole(["clinic_owner"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", staffId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };
  revalidatePath("/owner/staff");
  return { success: true };
}

const settingsSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  consultationFee: z.coerce.number().min(0),
});

export async function updateClinicSettingsAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    consultationFee: formData.get("consultationFee"),
  });

  if (!parsed.success) return { error: "Invalid settings" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clinics")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address,
      consultation_fee_default: parsed.data.consultationFee,
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
    .select("*, staff_module_permissions(module_key, permission_level)")
    .eq("clinic_id", clinicId)
    .neq("role", "clinic_owner")
    .order("created_at", { ascending: false });
  return data ?? [];
}
