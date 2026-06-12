"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { generateBillingInsights, type BillingInsight } from "@/lib/ai/billing-assistant";
import { analyzeHealthRisksWithAI } from "@/lib/ai/health-risk";

export async function getAIBillingInsights(clinicId: string): Promise<BillingInsight[]> {
  await requireRole(["clinic_owner", "finance_manager"]);
  const supabase = await createClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30);

  const [{ data: consultations }, { data: bills }, { data: unpaidBills }, { data: policies }] = await Promise.all([
    supabase
      .from("consultations")
      .select("id, started_at, patients(full_name)")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .gte("ended_at", sevenDaysAgo.toISOString()),
    supabase
      .from("bills")
      .select("consultation_id")
      .eq("clinic_id", clinicId)
      .not("consultation_id", "is", null),
    supabase
      .from("bills")
      .select("id, total_amount, created_at, patients(full_name)")
      .eq("clinic_id", clinicId)
      .in("status", ["unpaid", "partial"]),
    supabase
      .from("insurance_policies")
      .select("company, expiry_date, patients(full_name)")
      .eq("clinic_id", clinicId)
      .lte("expiry_date", new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]),
  ]);

  const billedConsultationIds = new Set((bills ?? []).map((b) => b.consultation_id));
  const consultationsWithoutBills = (consultations ?? [])
    .filter((c) => !billedConsultationIds.has(c.id))
    .map((c) => ({
      id: c.id,
      patientName: (c.patients as unknown as { full_name: string })?.full_name ?? "Unknown",
      date: new Date(c.started_at).toLocaleDateString(),
    }));

  const now = Date.now();
  const unpaid = (unpaidBills ?? []).map((b) => ({
    id: b.id,
    patientName: (b.patients as unknown as { full_name: string })?.full_name ?? "Unknown",
    amount: Number(b.total_amount),
    daysOverdue: Math.floor((now - new Date(b.created_at).getTime()) / 86400000),
  }));

  const expiringPolicies = (policies ?? []).map((p) => ({
    patientName: (p.patients as unknown as { full_name: string })?.full_name ?? "Unknown",
    company: p.company,
    expiryDate: new Date(p.expiry_date).toLocaleDateString(),
  }));

  return generateBillingInsights({
    consultationsWithoutBills,
    unpaidBills: unpaid,
    duplicateBills: [],
    expiringPolicies,
  });
}

export async function getHealthRiskFlags(clinicId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("health_risk_flags")
    .select("*, patients(full_name)")
    .eq("clinic_id", clinicId)
    .eq("is_resolved", false)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return data ?? [];
}

export async function runHealthRiskAnalysisAction(patientId: string) {
  const profile = await requireRole(["doctor", "clinic_owner", "receptionist"]);
  const supabase = await createClient();

  const [{ data: patient }, { data: vitals }] = await Promise.all([
    supabase.from("patients").select("full_name, clinic_id").eq("id", patientId).single(),
    supabase
      .from("patient_vitals")
      .select("*")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .limit(10),
  ]);

  if (!patient || !vitals?.length) return { error: "No vitals data" };

  const current = vitals[0];
  const history = vitals.map((v) => ({
    weightKg: v.weight_kg,
    bpSystolic: v.bp_systolic,
    bloodSugar: v.blood_sugar,
    recordedAt: v.recorded_at,
  }));

  const flags = await analyzeHealthRisksWithAI(
    patient.clinic_id,
    patient.full_name,
    {
      weightKg: current.weight_kg,
      bpSystolic: current.bp_systolic,
      bpDiastolic: current.bp_diastolic,
      bloodSugar: current.blood_sugar,
      bmi: current.bmi,
    },
    history
  );

  for (const flag of flags) {
    await supabase.from("health_risk_flags").insert({
      clinic_id: patient.clinic_id,
      patient_id: patientId,
      risk_type: flag.riskType,
      severity: flag.severity,
      details: flag.details,
    });
  }

  return { success: true, flagsCreated: flags.length };
}

export async function getFollowUpTasks(clinicId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follow_up_tasks")
    .select("*, patients(full_name)")
    .eq("clinic_id", clinicId)
    .order("scheduled_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return data ?? [];
}

export async function getAIUsageSummary(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_usage_logs")
    .select("feature, tokens_used, cost_estimate")
    .eq("clinic_id", clinicId);

  const byFeature: Record<string, { tokens: number; cost: number; count: number }> = {};
  for (const log of data ?? []) {
    const cur = byFeature[log.feature] ?? { tokens: 0, cost: 0, count: 0 };
    cur.tokens += log.tokens_used ?? 0;
    cur.cost += Number(log.cost_estimate ?? 0);
    cur.count += 1;
    byFeature[log.feature] = cur;
  }
  return byFeature;
}
