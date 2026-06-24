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
    queueInService: number;
    queueCompletedToday: number;
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
  charts: {
    dailyRevenue: { date: string; revenue: number; invoices: number }[];
    paymentMix: { method: string; amount: number }[];
    collectionHealth: { name: string; value: number }[];
    patientMix: { name: string; value: number }[];
    doctorUtilization: { name: string; value: number }[];
    queueStatus: { name: string; value: number }[];
  };
  isFranchise: boolean;
  branchCount: number;
}

export type DashboardOperationsSnapshot = {
  operations: ExecutiveDashboardData["operations"];
  queueStatus: ExecutiveDashboardData["charts"]["queueStatus"];
};

function buildQueueStatus(operations: {
  patientsWaiting: number;
  queueInService: number;
  queueCompletedToday: number;
}) {
  return [
    { name: "Waiting", value: operations.patientsWaiting },
    { name: "In service", value: operations.queueInService },
    { name: "Completed", value: operations.queueCompletedToday },
  ];
}

async function getOperationsMetrics(clinicIds: string[]) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: patientsWaiting },
    { count: queueInService },
    { data: doctors },
    { data: activeConsults },
    { data: servedToday },
    { count: queueCompletedToday },
  ] = await Promise.all([
    supabase
      .from("queue_tokens")
      .select("id", { count: "exact", head: true })
      .in("clinic_id", clinicIds)
      .eq("status", "waiting"),
    supabase
      .from("queue_tokens")
      .select("id", { count: "exact", head: true })
      .in("clinic_id", clinicIds)
      .in("status", ["called", "serving"]),
    supabase.from("doctors").select("id").in("clinic_id", clinicIds),
    supabase
      .from("consultations")
      .select("doctor_id")
      .in("clinic_id", clinicIds)
      .eq("status", "in_progress")
      .gte("started_at", `${today}T00:00:00`),
    supabase
      .from("queue_tokens")
      .select("created_at, serving_at")
      .in("clinic_id", clinicIds)
      .eq("status", "completed")
      .gte("completed_at", `${today}T00:00:00`),
    supabase
      .from("queue_tokens")
      .select("id", { count: "exact", head: true })
      .in("clinic_id", clinicIds)
      .eq("status", "completed")
      .gte("completed_at", `${today}T00:00:00`),
  ]);

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

  return {
    patientsWaiting: patientsWaiting ?? 0,
    averageWaitMins,
    doctorUtilization,
    activeDoctors,
    totalDoctors,
    queueInService: queueInService ?? 0,
    queueCompletedToday: queueCompletedToday ?? 0,
  };
}

async function getChartData(
  clinicIds: string[],
  growth: { newPatients: number; returningPatients: number; lostPatients: number },
  operations: { activeDoctors: number; totalDoctors: number; patientsWaiting: number; queueInService: number; queueCompletedToday: number },
  business: { revenueThisMonth: number; outstandingPayments: number }
) {
  const supabase = await createClient();
  const start = new Date();
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);

  const [{ data: payments }, { data: bills }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, method, paid_at")
      .in("clinic_id", clinicIds)
      .eq("status", "completed")
      .gte("paid_at", start.toISOString()),
    supabase
      .from("bills")
      .select("status, total_amount, paid_amount, created_at")
      .in("clinic_id", clinicIds)
      .gte("created_at", start.toISOString()),
  ]);

  const formatKey = (date: Date) => date.toISOString().split("T")[0];
  const revenueByDay = new Map<string, { date: string; revenue: number; invoices: number }>();

  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = formatKey(date);
    revenueByDay.set(key, {
      date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: 0,
      invoices: 0,
    });
  }

  for (const payment of payments ?? []) {
    if (!payment.paid_at) continue;
    const key = String(payment.paid_at).split("T")[0];
    const day = revenueByDay.get(key);
    if (day) day.revenue += Number(payment.amount ?? 0);
  }

  for (const bill of bills ?? []) {
    if (!bill.created_at) continue;
    const key = String(bill.created_at).split("T")[0];
    const day = revenueByDay.get(key);
    if (day) day.invoices += 1;
  }

  const methodTotals = new Map<string, number>();
  for (const payment of payments ?? []) {
    const method = String(payment.method ?? "other").replace(/_/g, " ");
    methodTotals.set(method, (methodTotals.get(method) ?? 0) + Number(payment.amount ?? 0));
  }

  const idleDoctors = Math.max(0, operations.totalDoctors - operations.activeDoctors);

  return {
    dailyRevenue: Array.from(revenueByDay.values()),
    paymentMix: Array.from(methodTotals.entries()).map(([method, amount]) => ({ method, amount })),
    collectionHealth: [
      { name: "Collected", value: business.revenueThisMonth },
      { name: "Outstanding", value: business.outstandingPayments },
    ],
    patientMix: [
      { name: "New", value: growth.newPatients },
      { name: "Returning", value: growth.returningPatients },
      { name: "At risk", value: growth.lostPatients },
    ],
    doctorUtilization: [
      { name: "Active", value: operations.activeDoctors },
      { name: "Available", value: idleDoctors },
    ],
    queueStatus: buildQueueStatus(operations),
  };
}

async function getGrowthMetrics(clinicIds: string[]) {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyStr = ninetyDaysAgo.toISOString().split("T")[0];
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearAgoStr = yearAgo.toISOString().split("T")[0];

  const [
    { count: newPatients },
    { data: visitRows, error: emrErr },
    { data: recentVisits },
    { data: oldPatients },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .in("clinic_id", clinicIds)
      .eq("is_active", true)
      .gte("created_at", monthStartStr),
    supabase
      .from("emr_records")
      .select("patient_id")
      .in("clinic_id", clinicIds)
      .gte("created_at", `${yearAgoStr}T00:00:00`),
    supabase
      .from("emr_records")
      .select("patient_id")
      .in("clinic_id", clinicIds)
      .gte("created_at", `${ninetyStr}T00:00:00`),
    supabase
      .from("patients")
      .select("id")
      .in("clinic_id", clinicIds)
      .eq("is_active", true)
      .lt("created_at", ninetyStr),
  ]);

  if (emrErr) {
    return { newPatients: newPatients ?? 0, returningPatients: 0, lostPatients: 0 };
  }

  const visitCounts = new Map<string, number>();
  for (const v of visitRows ?? []) {
    visitCounts.set(v.patient_id, (visitCounts.get(v.patient_id) ?? 0) + 1);
  }
  const returningPatients = [...visitCounts.values()].filter((c) => c >= 2).length;

  const recentPatientIds = new Set((recentVisits ?? []).map((v) => v.patient_id));
  const lostPatients = (oldPatients ?? []).filter(
    (p) => visitCounts.has(p.id) && !recentPatientIds.has(p.id)
  ).length;

  return {
    newPatients: newPatients ?? 0,
    returningPatients,
    lostPatients,
  };
}

async function getLowPerformingBranch(clinicIds: string[]) {
  const supabase = await createClient();
  const monthStart = new Date().toISOString().slice(0, 7) + "-01";

  const branchRevenues = await Promise.all(
    clinicIds.map(async (id) => {
      const [{ data: payments }, { data: clinic }] = await Promise.all([
        supabase
          .from("payments")
          .select("amount")
          .eq("clinic_id", id)
          .eq("status", "completed")
          .gte("paid_at", `${monthStart}T00:00:00`),
        supabase.from("clinics").select("name, branch_label").eq("id", id).single(),
      ]);

      const revenue = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      return {
        name: clinic?.branch_label ?? clinic?.name ?? "Branch",
        revenue,
      };
    })
  );

  branchRevenues.sort((a, b) => a.revenue - b.revenue);
  if (branchRevenues.length > 1 && branchRevenues[0].revenue < branchRevenues[branchRevenues.length - 1].revenue) {
    return branchRevenues[0].name;
  }
  return null;
}

export async function getDashboardOperationsSnapshot(
  clinicId: string
): Promise<DashboardOperationsSnapshot> {
  await requireRole(["clinic_owner"]);
  const clinicIds = await getOwnerClinicIds(clinicId);
  const operations = await getOperationsMetrics(clinicIds);
  return {
    operations,
    queueStatus: buildQueueStatus(operations),
  };
}

export async function getExecutiveDashboard(clinicId: string): Promise<ExecutiveDashboardData> {
  await requireRole(["clinic_owner"]);
  const clinicIds = await getOwnerClinicIds(clinicId);
  const isFranchise = clinicIds.length > 1;

  const revenueResults = await Promise.all(clinicIds.map((id) => getRevenueStats(id)));
  const revenueToday = revenueResults.reduce((sum, rev) => sum + rev.todayRevenue, 0);
  const revenueThisMonth = revenueResults.reduce((sum, rev) => sum + rev.monthRevenue, 0);
  const outstandingPayments = revenueResults.reduce((sum, rev) => sum + rev.unpaidTotal, 0);
  const outstandingCount = revenueResults.reduce((sum, rev) => sum + rev.unpaidCount, 0);

  const [operations, growth, primaryInsights, healthRisks, followUps, lowPerformingBranch] =
    await Promise.all([
      getOperationsMetrics(clinicIds),
      getGrowthMetrics(clinicIds),
      getAIBillingInsights(clinicId).catch(() => []),
      getHealthRiskFlags(clinicId).catch(() => []),
      getFollowUpTasks(clinicId).catch(() => []),
      isFranchise ? getLowPerformingBranch(clinicIds) : Promise.resolve(null),
    ]);

  const pendingFollowUps = followUps.filter(
    (f) => !["adherence_yes", "adherence_no"].includes(f.status)
  ).length;

  const business = {
    revenueToday,
    revenueThisMonth,
    outstandingPayments,
    outstandingCount,
  };

  const charts = await getChartData(clinicIds, growth, operations, business);

  return {
    business,
    operations,
    growth,
    aiInsights: {
      revenueLeak: primaryInsights.filter((i) => i.type === "missing_bill" || i.type === "unpaid_invoice").length,
      followUpOpportunities: pendingFollowUps,
      highRiskPatients: healthRisks.length,
      lowPerformingBranch,
    },
    charts,
    isFranchise,
    branchCount: clinicIds.length,
  };
}
