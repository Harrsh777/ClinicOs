"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { z } from "zod";

export async function getPlatformOverview() {
  await requireRole(["super_admin"]);
  const service = await createServiceClient();

  const [
    { count: clinicCount },
    { count: patientCount },
    { count: appointmentCount },
    { count: pendingApps },
    { data: clinics },
    { data: recentPatients },
  ] = await Promise.all([
    service.from("clinics").select("*", { count: "exact", head: true }),
    service.from("patients").select("*", { count: "exact", head: true }),
    service
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    service
      .from("clinic_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    service
      .from("clinics")
      .select("id, name, clinic_code, status, city, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    service
      .from("patients")
      .select("id, full_name, clinic_id, created_at, clinics(name)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    clinicCount: clinicCount ?? 0,
    patientCount: patientCount ?? 0,
    appointmentCount30d: appointmentCount ?? 0,
    pendingApplications: pendingApps ?? 0,
    recentClinics: clinics ?? [],
    recentPatients: recentPatients ?? [],
  };
}

export async function getClinicPlatformDetail(clinicId: string) {
  await requireRole(["super_admin"]);
  const service = await createServiceClient();

  const [
    { data: clinic },
    { count: patientCount },
    { count: staffCount },
    { count: appointmentCount },
    { data: staff },
    { data: patients },
    { data: subscription },
  ] = await Promise.all([
    service.from("clinics").select("*").eq("id", clinicId).single(),
    service.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
    service
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId),
    service
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    service
      .from("profiles")
      .select("id, full_name, email, role, is_active, created_at")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false }),
    service
      .from("patients")
      .select("id, full_name, phone, patient_code, created_at, is_active")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(20),
    service
      .from("subscriptions")
      .select("*, plans(name, slug, price_monthly)")
      .eq("clinic_id", clinicId)
      .maybeSingle(),
  ]);

  return {
    clinic,
    patientCount: patientCount ?? 0,
    staffCount: staffCount ?? 0,
    appointmentCount30d: appointmentCount ?? 0,
    staff: staff ?? [],
    patients: patients ?? [],
    subscription,
  };
}

export async function getPlatformAnalytics() {
  await requireRole(["super_admin"]);
  const service = await createServiceClient();

  const [{ data: clinics }, { data: subscriptions }, { data: aiLogs }] = await Promise.all([
    service.from("clinics").select("id, status, created_at"),
    service.from("subscriptions").select("*, plans(price_monthly, name)"),
    service.from("ai_usage_logs").select("feature, tokens_used, cost_estimate, clinic_id"),
  ]);

  const activeClinics = (clinics ?? []).filter((c) => c.status === "active").length;
  const mrr = (subscriptions ?? [])
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce((sum, s) => sum + Number((s.plans as { price_monthly: number })?.price_monthly ?? 0), 0);

  const aiByFeature: Record<string, { tokens: number; cost: number }> = {};
  const aiByClinic: Record<string, number> = {};
  for (const log of aiLogs ?? []) {
    const f = aiByFeature[log.feature] ?? { tokens: 0, cost: 0 };
    f.tokens += log.tokens_used ?? 0;
    f.cost += Number(log.cost_estimate ?? 0);
    aiByFeature[log.feature] = f;
    aiByClinic[log.clinic_id] = (aiByClinic[log.clinic_id] ?? 0) + Number(log.cost_estimate ?? 0);
  }

  const churnRate = clinics?.length
    ? ((clinics.filter((c) => c.status === "suspended").length / clinics.length) * 100).toFixed(1)
    : "0";

  return {
    totalClinics: clinics?.length ?? 0,
    activeClinics,
    mrr,
    churnRate,
    aiByFeature,
    topAIClinics: Object.entries(aiByClinic)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([clinicId, cost]) => ({ clinicId, cost })),
  };
}

export async function updateClinicPlanAction(clinicId: string, planId: string) {
  await requireRole(["super_admin"]);
  const service = await createServiceClient();

  const { error } = await service
    .from("subscriptions")
    .update({ plan_id: planId, status: "active" })
    .eq("clinic_id", clinicId);

  if (error) return { error: error.message };
  revalidatePath("/admin/clinics");
  return { success: true };
}

const brandingSchema = z.object({
  clinicId: z.string().uuid(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logoUrl: z.string().optional(),
  customDomain: z.string().optional(),
  whiteLabel: z.coerce.boolean().optional(),
  whatsappNumber: z.string().optional(),
  tagline: z.string().optional(),
  portalWalkInEnabled: z.coerce.boolean().optional(),
  portalMaxDailyWalkIns: z.coerce.number().int().min(1).max(1000).optional(),
});

export async function updateClinicBrandingAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner", "super_admin"]);
  const parsed = brandingSchema.safeParse({
    clinicId: formData.get("clinicId") || profile.clinic_id,
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    logoUrl: formData.get("logoUrl"),
    customDomain: formData.get("customDomain"),
    whiteLabel: formData.get("whiteLabel") === "on" || formData.get("whiteLabel") === "true",
    whatsappNumber: formData.get("whatsappNumber"),
    tagline: formData.get("tagline"),
    portalWalkInEnabled: formData.get("portalWalkInEnabled") === "on" || formData.get("portalWalkInEnabled") === "true",
    portalMaxDailyWalkIns: formData.get("portalMaxDailyWalkIns")
      ? Number(formData.get("portalMaxDailyWalkIns"))
      : undefined,
  });

  if (!parsed.success) return { error: "Invalid branding data" };

  const supabase = await createClient();
  let logoUrl = parsed.data.logoUrl;
  const logoFile = formData.get("logoFile");

  if (logoFile instanceof File && logoFile.size > 0) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(logoFile.type)) {
      return { error: "Upload a PNG, JPG, WebP, or SVG logo" };
    }
    if (logoFile.size > 5 * 1024 * 1024) {
      return { error: "Logo must be smaller than 5 MB" };
    }

    const extension = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${parsed.data.clinicId}/branding/logo-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("clinic-assets")
      .upload(path, logoFile, {
        cacheControl: "31536000",
        upsert: true,
        contentType: logoFile.type,
      });

    if (uploadError) return { error: uploadError.message };

    const { data } = supabase.storage.from("clinic-assets").getPublicUrl(path);
    logoUrl = data.publicUrl;
  }

  const { error } = await supabase.from("clinic_branding").upsert(
    {
      clinic_id: parsed.data.clinicId,
      primary_color: parsed.data.primaryColor,
      secondary_color: parsed.data.secondaryColor,
      logo_url: logoUrl,
      custom_domain: parsed.data.customDomain,
      white_label: parsed.data.whiteLabel ?? false,
      whatsapp_number: parsed.data.whatsappNumber,
      tagline: parsed.data.tagline,
      portal_walk_in_enabled: parsed.data.portalWalkInEnabled !== false,
      portal_max_daily_walk_ins: parsed.data.portalMaxDailyWalkIns ?? 200,
    },
    { onConflict: "clinic_id" }
  );

  if (error) return { error: error.message };
  revalidatePath("/owner/branding");
  return { success: true };
}

export async function getClinicBranding(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clinic_branding")
    .select("*")
    .eq("clinic_id", clinicId)
    .single();
  return data;
}

export async function logImpersonationAction(targetClinicId: string) {
  const profile = await requireRole(["super_admin"]);
  const supabase = await createClient();

  await supabase.from("platform_audit_logs").insert({
    admin_id: profile.id,
    action: "clinic_impersonation_view",
    target_clinic_id: targetClinicId,
    details: { timestamp: new Date().toISOString() },
  });

  return { success: true };
}
