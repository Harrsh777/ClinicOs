"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { getRevenueStats } from "@/lib/actions/billing";
import { getAIBillingInsights, getHealthRiskFlags, getFollowUpTasks } from "@/lib/actions/ai-insights";
import { getOwnerClinicIds } from "@/lib/actions/franchise";

export interface ExecutiveDashboardData {
  business: {
    revenueToday: number;
    revenueThisMonth: number;
    outstandingPayments: number;
    outstandingCount: number;
  };
  operations: {
    patientsWaiting: number;
    averageWaitMins: number;
    doctorUtilization: number;
    activeDoctors: number;
    totalDoctors: number;
  };
  growth: {
    newPatients: number;
    returningPatients: number;
    lostPatients: number;
  };
  aiInsights: {
    revenueLeak: number;
    followUpOpportunities: number;
    highRiskPatients: number;
    lowPerformingBranch: string | null;
  };
  isFranchise: boolean;
  branchCount: number;
}

async function getOperationsMetrics(clinicIds: string[]) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: waitingTokens }, { data: doctors }, { data: activeConsults }] = await Promise.all([
    supabase
      .from("queue_tokens")
      .select("created_at, serving_at, called_at")
      .in("clinic_id", clinicIds)
      .eq("status", "waiting"),
    supabase.from("doctors").select("id").in("clinic_id", clinicIds),
    supabase
      .from("consultations")
      .select("doctor_id")
      .in("clinic_id", clinicIds)
      .eq("status", "in_progress")
      .gte("started_at", `${today}T00:00:00`),
  ]);

  const patientsWaiting = waitingTokens?.length ?? 0;

  const { data: servedToday } = await supabase
    .from("queue_tokens")
    .select("created_at, serving_at")
    .in("clinic_id", clinicIds)
    .eq("status", "completed")
    .gte("completed_at", `${today}T00:00:00`);

  let averageWaitMins = 0;
  const waits = (servedToday ?? [])
    .filter((t) => t.serving_at && t.created_at)
    .map((t) => (new Date(t.serving_at!).getTime() - new Date(t.created_at).getTime()) / 60000);
  if (waits.length > 0) {
    averageWaitMins = Math.round(waits.reduce((a, b) => a + b, 0) / waits.length);
  }

  const totalDoctors = doctors?.length ?? 0;
  const activeDoctorIds = new Set((activeConsults ?? []).map((c) => c.doctor_id));
  const activeDoctors = activeDoctorIds.size;
  const doctorUtilization = totalDoctors > 0 ? Math.round((activeDoctors / totalDoctors) * 100) : 0;

  return { patientsWaiting, averageWaitMins, doctorUtilization, activeDoctors, totalDoctors };
}

async function getGrowthMetrics(clinicIds: string[]) {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyStr = ninetyDaysAgo.toISOString().split("T")[0];

  const { data: allPatients } = await supabase
    .from("patients")
    .select("id, created_at")
    .in("clinic_id", clinicIds)
    .eq("is_active", true);

  const newPatients = (allPatients ?? []).filter((p) => p.created_at >= monthStartStr).length;

  const { data: emrVisits, error: emrErr } = await supabase
    .from("emr_records")
    .select("patient_id")
    .in("clinic_id", clinicIds);

  if (emrErr) {
    return { newPatients, returningPatients: 0, lostPatients: 0 };
  }

  const visitCounts = new Map<string, number>();
  for (const v of emrVisits ?? []) {
    visitCounts.set(v.patient_id, (visitCounts.get(v.patient_id) ?? 0) + 1);
  }
  const returningPatients = [...visitCounts.values()].filter((c) => c >= 2).length;

  const { data: recentVisits } = await supabase
    .from("emr_records")
    .select("patient_id, created_at")
    .in("clinic_id", clinicIds)
    .gte("created_at", `${ninetyStr}T00:00:00`);

  const recentPatientIds = new Set((recentVisits ?? []).map((v) => v.patient_id));
  const lostPatients = (allPatients ?? []).filter(
    (p) => p.created_at < ninetyStr && !recentPatientIds.has(p.id) && visitCounts.has(p.id)
  ).length;

  return { newPatients, returningPatients, lostPatients };
}

export async function getExecutiveDashboard(clinicId: string): Promise<ExecutiveDashboardData> {
  await requireRole(["clinic_owner"]);
  const clinicIds = await getOwnerClinicIds(clinicId);
  const isFranchise = clinicIds.length > 1;

  let revenueToday = 0;
  let revenueThisMonth = 0;
  let outstandingPayments = 0;
  let outstandingCount = 0;

  for (const id of clinicIds) {
    const rev = await getRevenueStats(id);
    revenueToday += rev.todayRevenue;
    revenueThisMonth += rev.monthRevenue;
    outstandingPayments += rev.unpaidTotal;
    outstandingCount += rev.unpaidCount;
  }

  const [operations, growth] = await Promise.all([
    getOperationsMetrics(clinicIds),
    getGrowthMetrics(clinicIds),
  ]);

  const primaryInsights = await getAIBillingInsights(clinicId).catch(() => []);
  const healthRisks = await getHealthRiskFlags(clinicId).catch(() => []);
  const followUps = await getFollowUpTasks(clinicId).catch(() => []);
  const pendingFollowUps = followUps.filter(
    (f) => !["adherence_yes", "adherence_no"].includes(f.status)
  ).length;

  let lowPerformingBranch: string | null = null;
  if (isFranchise) {
    const supabase = await createClient();
    const monthStart = new Date().toISOString().slice(0, 7) + "-01";
    const branchRevenues: { name: string; revenue: number }[] = [];

    for (const id of clinicIds) {
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("clinic_id", id)
        .eq("status", "completed")
        .gte("paid_at", `${monthStart}T00:00:00`);

      const { data: clinic } = await supabase.from("clinics").select("name, branch_label").eq("id", id).single();
      const revenue = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      branchRevenues.push({
        name: clinic?.branch_label ?? clinic?.name ?? "Branch",
        revenue,
      });
    }

    branchRevenues.sort((a, b) => a.revenue - b.revenue);
    if (branchRevenues.length > 1 && branchRevenues[0].revenue < branchRevenues[branchRevenues.length - 1].revenue) {
      lowPerformingBranch = branchRevenues[0].name;
    }
  }

  return {
    business: {
      revenueToday,
      revenueThisMonth,
      outstandingPayments,
      outstandingCount,
    },
    operations,
    growth,
    aiInsights: {
      revenueLeak: primaryInsights.filter((i) => i.type === "missing_bill" || i.type === "unpaid_invoice").length,
      followUpOpportunities: pendingFollowUps,
      highRiskPatients: healthRisks.length,
      lowPerformingBranch,
    },
    isFranchise,
    branchCount: clinicIds.length,
  };
}
