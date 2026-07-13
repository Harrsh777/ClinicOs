"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/auth/audit";
import {
  defaultProgress,
  mergeProgress,
  type OnboardingProgress,
} from "@/lib/types/onboarding";

export async function getOnboardingState() {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return null;

  const supabase = await createClient();
  const [{ data: clinic }, { data: billing }] = await Promise.all([
    supabase.from("clinics").select("*").eq("id", profile.clinic_id).single(),
    supabase.from("clinic_billing_settings").select("*").eq("clinic_id", profile.clinic_id).maybeSingle(),
  ]);

  const stored = (clinic?.onboarding_progress ?? {}) as Partial<OnboardingProgress>;
  const progress = mergeProgress(stored, clinic?.name);

  if (clinic) {
    progress.step2 = {
      ...progress.step2!,
      clinicName: progress.step2!.clinicName || clinic.name || "",
      logoUrl: progress.step2!.logoUrl || clinic.logo_url || "",
      address: progress.step2!.address || clinic.address || "",
      city: progress.step2!.city || clinic.city || "",
      state: progress.step2!.state || clinic.state || "",
      pincode: progress.step2!.pincode || clinic.pincode || "",
      phone: progress.step2!.phone || clinic.phone || "",
      email: progress.step2!.email || clinic.email || "",
      website: progress.step2!.website || clinic.website || "",
      googleMapsLink: progress.step2!.googleMapsLink || clinic.google_maps_link || "",
      latitude: progress.step2!.latitude || (clinic.latitude != null ? String(clinic.latitude) : ""),
      longitude: progress.step2!.longitude || (clinic.longitude != null ? String(clinic.longitude) : ""),
      emergencyAvailable: progress.step2!.emergencyAvailable ?? clinic.emergency_available ?? false,
      parking: progress.step2!.parking ?? clinic.parking_available ?? false,
      wheelchairAccess: progress.step2!.wheelchairAccess ?? clinic.wheelchair_access ?? false,
      otherFacilities: progress.step2!.otherFacilities || (clinic.other_facilities ?? []).join(", "),
      images: progress.step2!.images || (clinic.facility_images ?? []).join("\n"),
    };

    if (billing) {
      progress.step3 = {
        ...progress.step3!,
        normalConsultation: String(clinic.consultation_fee_default ?? progress.step3!.normalConsultation),
        emergencyConsultation: String(billing.emergency_consultation_fee ?? progress.step3!.emergencyConsultation),
        videoConsultation: String(billing.video_consultation_fee ?? progress.step3!.videoConsultation),
        homeVisit: String(billing.home_visit_fee ?? progress.step3!.homeVisit),
        followUpFee: String(billing.follow_up_fee ?? progress.step3!.followUpFee),
        freeFollowUpDays: String(billing.free_follow_up_days ?? progress.step3!.freeFollowUpDays),
        refundPolicy: billing.refund_policy ?? progress.step3!.refundPolicy,
        cancellationPolicy: billing.cancellation_policy ?? progress.step3!.cancellationPolicy,
        paymentMethods: Object.entries((billing.payment_methods as Record<string, boolean>) ?? {})
          .filter(([, v]) => v)
          .map(([k]) => k),
      };
      progress.step5 = {
        ...progress.step5!,
        upi: billing.upi_id ?? progress.step5!.upi,
        gst: billing.gst_number ?? progress.step5!.gst,
        invoicePrefix: billing.invoice_prefix ?? progress.step5!.invoicePrefix,
        prescriptionHeader: billing.prescription_header ?? progress.step5!.prescriptionHeader,
        digitalSignatureUrl: billing.digital_signature_url ?? progress.step5!.digitalSignatureUrl,
        socialLinks: billing.social_links ? JSON.stringify(billing.social_links) : progress.step5!.socialLinks,
      };
    }
  }

  return { clinic, billing, progress, profile };
}

async function saveProgress(clinicId: string, progress: OnboardingProgress) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clinics")
    .update({ onboarding_progress: progress })
    .eq("id", clinicId);
  if (error) throw new Error(error.message);
}

export async function saveOnboardingProgressAction(progress: OnboardingProgress) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  try {
    await saveProgress(profile.clinic_id, progress);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save progress" };
  }
}

export async function completeOnboardingAction(progress: OnboardingProgress) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const doctors = progress.step1?.doctors ?? [];
  if (!doctors.length || !doctors[0]?.name?.trim()) {
    return { error: "Add at least one doctor with a name" };
  }
  if (!progress.step2?.address?.trim() || !progress.step2?.city?.trim()) {
    return { error: "Clinic address and city are required" };
  }

  const supabase = await createClient();
  const clinicId = profile.clinic_id;
  const s2 = progress.step2!;
  const s3 = progress.step3 ?? defaultProgress().step3!;
  const s5 = progress.step5 ?? defaultProgress().step5!;

  const openingHours: Record<string, { open: string; close: string } | null> = {};
  const firstDoctorId = doctors[0]!.id;
  const firstSchedule = progress.step4?.schedules?.[firstDoctorId];
  if (firstSchedule?.weekly) {
    for (const [day, hours] of Object.entries(firstSchedule.weekly)) {
      openingHours[day] = hours.closed ? null : { open: hours.open, close: hours.close };
    }
  }

  const facilityImages = s2.images
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);
  const otherFacilities = s2.otherFacilities
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const paymentMethods = {
    cash: s3.paymentMethods.includes("cash"),
    upi: s3.paymentMethods.includes("upi"),
    card: s3.paymentMethods.includes("card"),
    insurance: s3.paymentMethods.includes("insurance"),
  };

  let socialLinks: Record<string, string> = {};
  try {
    if (s5.socialLinks.trim()) socialLinks = JSON.parse(s5.socialLinks);
  } catch {
    socialLinks = { website: s5.socialLinks };
  }

  await supabase
    .from("clinics")
    .update({
      name: s2.clinicName || undefined,
      logo_url: s2.logoUrl || null,
      address: s2.address,
      city: s2.city,
      state: s2.state,
      pincode: s2.pincode || null,
      phone: s2.phone || null,
      email: s2.email || null,
      website: s2.website || null,
      google_maps_link: s2.googleMapsLink || null,
      latitude: s2.latitude ? parseFloat(s2.latitude) : null,
      longitude: s2.longitude ? parseFloat(s2.longitude) : null,
      emergency_available: s2.emergencyAvailable,
      parking_available: s2.parking,
      wheelchair_access: s2.wheelchairAccess,
      facility_images: facilityImages,
      other_facilities: otherFacilities,
      consultation_fee_default: parseFloat(s3.normalConsultation) || 500,
      opening_hours: Object.keys(openingHours).length ? openingHours : undefined,
      settings: {
        onboarding_doctors: doctors,
        onboarding_schedules: progress.step4?.schedules ?? {},
        onboarding_doctors_provisioned: 0,
        setup_completed_at: new Date().toISOString(),
      },
      clinic_setup_completed: true,
      portal_enabled: true,
      status: "active",
      onboarding_progress: { ...progress, currentStep: 5 },
    })
    .eq("id", clinicId);

  await supabase.from("clinic_billing_settings").upsert({
    clinic_id: clinicId,
    emergency_consultation_fee: parseFloat(s3.emergencyConsultation) || null,
    video_consultation_fee: parseFloat(s3.videoConsultation) || null,
    home_visit_fee: parseFloat(s3.homeVisit) || null,
    follow_up_fee: parseFloat(s3.followUpFee) || null,
    free_follow_up_days: parseInt(s3.freeFollowUpDays, 10) || 7,
    refund_policy: s3.refundPolicy || null,
    cancellation_policy: s3.cancellationPolicy || null,
    payment_methods: paymentMethods,
    upi_id: s5.upi || null,
    gst_number: s5.gst || null,
    invoice_prefix: s5.invoicePrefix || "INV",
    prescription_header: s5.prescriptionHeader || null,
    digital_signature_url: s5.digitalSignatureUrl || null,
    social_links: socialLinks,
  });

  if (s5.whatsappNumber) {
    await supabase.from("clinic_branding").upsert({
      clinic_id: clinicId,
      whatsapp_number: s5.whatsappNumber,
      primary_color: "#0F172A",
      secondary_color: "#14B8A6",
    });
  }

  await logAuditEvent({
    clinicId,
    actorId: profile.id,
    action: "clinic.setup_completed",
    entityType: "clinic",
    entityId: clinicId,
    metadata: { doctors: doctors.length },
  });

  revalidatePath("/owner");
  redirect("/owner");
}
