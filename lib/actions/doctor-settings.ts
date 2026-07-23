"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { z } from "zod";

const doctorSettingsSchema = z.object({
  name: z.string().min(2, "Clinic name must be at least 2 characters"),
  phone: z.string().optional(),
  address: z.string().optional(),
  consultationFee: z.coerce.number().min(0).default(500),
  emergencyFee: z.coerce.number().min(0).optional(),
  teleconsultFee: z.coerce.number().min(0).optional(),
  onlineBookingEnabled: z.boolean(),
  teleconsultEnabled: z.boolean(),
  emergencyEnabled: z.boolean(),
  themePreset: z.enum([
    "clinical_teal",
    "kids_pediatric",
    "dental_care",
    "dermatology_rose",
    "emergency_slate",
    "holistic_sage",
  ]).default("clinical_teal"),
  coverImageUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  specializationBadge: z.string().optional(),
  bioDescription: z.string().optional(),
  tagline: z.string().optional(),
});

export async function updateDoctorClinicSettingsAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No active clinic found" };

  const parsed = doctorSettingsSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    consultationFee: formData.get("consultationFee"),
    emergencyFee: formData.get("emergencyFee") || undefined,
    teleconsultFee: formData.get("teleconsultFee") || undefined,
    onlineBookingEnabled: formData.get("onlineBookingEnabled") === "true" || formData.get("onlineBookingEnabled") === "on",
    teleconsultEnabled: formData.get("teleconsultEnabled") === "true" || formData.get("teleconsultEnabled") === "on",
    emergencyEnabled: formData.get("emergencyEnabled") === "true" || formData.get("emergencyEnabled") === "on",
    themePreset: formData.get("themePreset") || "clinical_teal",
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
    specializationBadge: formData.get("specializationBadge") || undefined,
    bioDescription: formData.get("bioDescription") || undefined,
    tagline: formData.get("tagline") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid settings data" };
  }

  const service = await createServiceClient();

  // 1. Update clinic table (name, phone, address, fee, emergency_available, portal_enabled)
  const { error: clinicErr } = await service
    .from("clinics")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      consultation_fee_default: parsed.data.consultationFee,
      emergency_available: parsed.data.emergencyEnabled,
      portal_enabled: parsed.data.onlineBookingEnabled,
      logo_url: parsed.data.logoUrl ?? null,
    })
    .eq("id", profile.clinic_id);

  if (clinicErr) return { error: clinicErr.message };

  // 2. Ensure doctor row exists & set is_accepting_appointments = onlineBookingEnabled
  const { data: existingDoc } = await service
    .from("doctors")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existingDoc) {
    await service
      .from("doctors")
      .update({
        is_accepting_appointments: parsed.data.onlineBookingEnabled,
        consultation_fee: parsed.data.consultationFee,
        specialization: parsed.data.specializationBadge ?? null,
      })
      .eq("id", existingDoc.id);
  } else {
    await service.from("doctors").insert({
      profile_id: profile.id,
      clinic_id: profile.clinic_id,
      is_accepting_appointments: parsed.data.onlineBookingEnabled,
      consultation_fee: parsed.data.consultationFee,
      specialization: parsed.data.specializationBadge ?? null,
    });
  }

  // 3. Update/upsert clinic_branding table (theme, cover photo, logo, badge, bio, toggles)
  const { error: brandingErr } = await service
    .from("clinic_branding")
    .upsert({
      clinic_id: profile.clinic_id,
      theme_preset: parsed.data.themePreset,
      cover_image_url: parsed.data.coverImageUrl ?? null,
      logo_url: parsed.data.logoUrl ?? null,
      specialization_badge: parsed.data.specializationBadge ?? null,
      bio_description: parsed.data.bioDescription ?? null,
      tagline: parsed.data.tagline ?? null,
      teleconsult_enabled: parsed.data.teleconsultEnabled,
      emergency_enabled: parsed.data.emergencyEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: "clinic_id" });

  if (brandingErr) {
    console.error("[updateDoctorClinicSettings] branding error:", brandingErr.message);
  }

  // 4. Update billing settings for fees
  if (parsed.data.emergencyFee != null || parsed.data.teleconsultFee != null) {
    await service.from("clinic_billing_settings").upsert({
      clinic_id: profile.clinic_id,
      emergency_consultation_fee: parsed.data.emergencyFee ?? null,
      video_consultation_fee: parsed.data.teleconsultFee ?? null,
    }, { onConflict: "clinic_id" });
  }

  revalidatePath("/owner/settings");
  revalidatePath("/doctor/settings");
  revalidatePath("/c/[clinicSlug]/bookings");
  return { success: true };
}
