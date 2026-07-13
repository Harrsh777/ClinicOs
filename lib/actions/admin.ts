"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const createClinicSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  phone: z.string().optional(),
  ownerEmail: z.string().email(),
  planId: z.string().uuid(),
});

export async function createClinicAction(formData: FormData) {
  await requirePlatformAdmin();

  const parsed = createClinicSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    ownerEmail: formData.get("ownerEmail"),
    planId: formData.get("planId"),
  });

  if (!parsed.success) return { error: "Invalid form data" };

  const service = await createServiceClient();
  const slug = slugify(parsed.data.name) + "-" + Date.now().toString(36);

  const { data: clinic, error: clinicError } = await service
    .from("clinics")
    .insert({
      name: parsed.data.name,
      slug,
      address: parsed.data.address,
      phone: parsed.data.phone,
      status: "trial",
    })
    .select()
    .single();

  if (clinicError || !clinic) return { error: clinicError?.message ?? "Failed to create clinic" };

  await service.from("subscriptions").insert({
    clinic_id: clinic.id,
    plan_id: parsed.data.planId,
    status: "trialing",
  });

  const token = crypto.randomUUID().replace(/-/g, "");
  await service.from("staff_invites").insert({
    clinic_id: clinic.id,
    email: parsed.data.ownerEmail,
    role: "clinic_owner",
    token,
    module_keys: ["dashboard", "patients", "appointments", "queue", "staff", "permissions", "settings", "finance"],
  });

  revalidatePath("/admin/clinics");
  return { success: true, clinicId: clinic.id, inviteToken: token };
}

export async function suspendClinicAction(clinicId: string, suspend: boolean) {
  await requirePlatformAdmin();
  const supabase = await createClient();

  let portalEnabled: boolean | undefined;
  if (!suspend) {
    const { data: clinic } = await supabase
      .from("clinics")
      .select("clinic_setup_completed")
      .eq("id", clinicId)
      .single();
    portalEnabled = clinic?.clinic_setup_completed ?? false;
  }

  const { error } = await supabase
    .from("clinics")
    .update({
      status: suspend ? "suspended" : "active",
      ...(suspend ? { portal_enabled: false } : portalEnabled !== undefined ? { portal_enabled: portalEnabled } : {}),
    })
    .eq("id", clinicId);

  if (error) return { error: error.message };
  revalidatePath("/admin/clinics");
  return { success: true };
}

export async function getPlans() {
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("*").eq("is_active", true);
  return data ?? [];
}

export async function getClinics() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("clinics")
    .select("*, subscriptions(*, plans(name, slug))")
    .order("created_at", { ascending: false });
  return data ?? [];
}
