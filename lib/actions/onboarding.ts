"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/auth/audit";
import { z } from "zod";

export async function getOnboardingState() {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return null;

  const supabase = await createClient();
  const [{ data: clinic }, { data: departments }] = await Promise.all([
    supabase.from("clinics").select("*").eq("id", profile.clinic_id).single(),
    supabase.from("departments").select("id, name").eq("clinic_id", profile.clinic_id).order("name"),
  ]);

  const { data: plans } = await supabase
    .from("plans")
    .select("id, slug, name, price_monthly")
    .eq("is_active", true)
    .order("price_monthly");

  return { clinic, departments: departments ?? [], plans: plans ?? [] };
}

const step1Schema = z.object({
  address: z.string().min(5),
  registrationNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export async function saveOnboardingStep1Action(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const parsed = step1Schema.safeParse({
    address: formData.get("address"),
    registrationNumber: formData.get("registrationNumber") || undefined,
    gstNumber: formData.get("gstNumber") || undefined,
    emergencyContact: formData.get("emergencyContact") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
  });

  if (!parsed.success) return { error: "Please fill required clinic details" };

  const openingHours: Record<string, { open: string; close: string } | null> = {};
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  for (const day of days) {
    const open = formData.get(`${day}Open`) as string;
    const close = formData.get(`${day}Close`) as string;
    const closed = formData.get(`${day}Closed`) === "on";
    openingHours[day] = closed || !open ? null : { open, close: close || "18:00" };
  }

  const dailyPatientCapacity = parseInt(String(formData.get("dailyPatientCapacity") ?? "50"), 10) || 50;
  const avgFeePerPatient = parseFloat(String(formData.get("avgFeePerPatient") ?? "500")) || 500;

  const supabase = await createClient();
  const { data: existingClinic } = await supabase
    .from("clinics")
    .select("settings")
    .eq("id", profile.clinic_id!)
    .single();

  const settings = { ...((existingClinic?.settings ?? {}) as Record<string, unknown>) };
  settings.queue = {
    dailyPatientCapacity,
    avgFeePerPatient,
  };

  const { error } = await supabase
    .from("clinics")
    .update({
      address: parsed.data.address,
      registration_number: parsed.data.registrationNumber ?? null,
      gst_number: parsed.data.gstNumber ?? null,
      emergency_contact: parsed.data.emergencyContact ?? null,
      logo_url: parsed.data.logoUrl || null,
      opening_hours: openingHours,
      consultation_fee_default: avgFeePerPatient,
      daily_patient_capacity: dailyPatientCapacity,
      settings,
    })
    .eq("id", profile.clinic_id);

  if (error) return { error: error.message };
  return { success: true, step: 2 };
}

export async function saveOnboardingStep2Action(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const selected = formData.getAll("departments") as string[];
  const supabase = await createClient();

  if (selected.length > 0) {
    await supabase
      .from("departments")
      .update({ is_active: false })
      .eq("clinic_id", profile.clinic_id);

    for (const name of selected) {
      await supabase.from("departments").upsert(
        { clinic_id: profile.clinic_id, name, is_active: true },
        { onConflict: "clinic_id,name" }
      );
    }
  }

  const custom = (formData.get("customDepartment") as string)?.trim();
  if (custom) {
    await supabase.from("departments").upsert(
      { clinic_id: profile.clinic_id, name: custom, is_active: true },
      { onConflict: "clinic_id,name" }
    );
  }

  return { success: true, step: 3 };
}

export async function saveOnboardingStep3Action(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const services = formData.getAll("services") as string[];
  const supabase = await createClient();

  const { error } = await supabase
    .from("clinics")
    .update({ enabled_services: services })
    .eq("id", profile.clinic_id);

  if (error) return { error: error.message };
  return { success: true, step: 4 };
}

export async function completeOnboardingAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const planSlug = (formData.get("planSlug") as string) || "free";
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("slug", planSlug)
    .maybeSingle();

  if (plan) {
    await supabase
      .from("subscriptions")
      .update({ plan_id: plan.id })
      .eq("clinic_id", profile.clinic_id);
  }

  await supabase
    .from("clinics")
    .update({ clinic_setup_completed: true, status: "active" })
    .eq("id", profile.clinic_id);

  await supabase
    .from("profiles")
    .update({ first_login: false })
    .eq("id", profile.id);

  await logAuditEvent({
    clinicId: profile.clinic_id,
    actorId: profile.id,
    action: "clinic.setup_completed",
    entityType: "clinic",
    entityId: profile.clinic_id,
    metadata: { plan_slug: planSlug, services: formData.getAll("services") },
  });

  revalidatePath("/owner");
  redirect("/owner");
}
