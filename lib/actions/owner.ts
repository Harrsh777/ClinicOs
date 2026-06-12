"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
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
  return { success: true, inviteUrl: `/invite/${token}` };
}

export async function updateStaffPermissionsAction(
  staffId: string,
  permissions: { moduleKey: string; level: "read" | "write" | "admin" }[]
) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();

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
