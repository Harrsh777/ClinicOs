"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { z } from "zod";

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
  });

  if (!parsed.success) return { error: "Invalid branding data" };

  const supabase = await createClient();
  const { error } = await supabase.from("clinic_branding").upsert(
    {
      clinic_id: parsed.data.clinicId,
      primary_color: parsed.data.primaryColor,
      secondary_color: parsed.data.secondaryColor,
      logo_url: parsed.data.logoUrl,
      custom_domain: parsed.data.customDomain,
      white_label: parsed.data.whiteLabel ?? false,
      whatsapp_number: parsed.data.whatsappNumber,
      tagline: parsed.data.tagline,
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
