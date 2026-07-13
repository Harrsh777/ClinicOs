"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { getRevenueStats } from "@/lib/actions/billing";
import { getAIBillingInsights, getHealthRiskFlags, getFollowUpTasks } from "@/lib/actions/ai-insights";
import { getOwnerClinicIds } from "@/lib/actions/franchise";

export interface DashboardAppointment {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: string;
  reason: string | null;
}

export interface DashboardDoctor {
  id: string;
  name: string;
  specialization: string | null;
  isAvailable: boolean;
  shiftLabel: string;
  shiftTime: string;
  avatarInitials: string;
}

export interface DashboardActivity {
  id: string;
  action: string;
  description: string;
  time: string;
  type: "appointment" | "payment" | "patient" | "queue" | "system";
}

export interface ExecutiveDashboardData {
  business: {
    revenueToday: number;
    revenueThisMonth: number;
    outstandingPayments: number;
    outstandingCount: number;
    revenueGrowth: number;
    patientGrowth: number;
    consultationGrowth: number;
  };
  operations: {
    patientsWaiting: number;
    averageWaitMins: number;
    doctorUtilization: number;
    activeDoctors: number;
    totalDoctors: number;
    queueInService: number;
    queueCompletedToday: number;
    totalPatients: number;
    totalConsultations: number;
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
    weeklyPatients: { day: string; new: number; returning: number; total: number }[];
    sparklineRevenue: number[];
    sparklinePatients: number[];
  };
  appointments: DashboardAppointment[];
  doctors: DashboardDoctor[];
  recentActivity: DashboardActivity[];
  calendarDays: { date: string; day: number; isToday: boolean; appointmentCount: number }[];
  isFranchise: boolean;
  branchCount: number;
}

export type DashboardOperationsSnapshot = {
  operations: {
    patientsWaiting: number;
    averageWaitMins: number;
    doctorUtilization: number;
    activeDoctors: number;
    totalDoctors: number;
    queueInService: number;
    queueCompletedToday: number;
  };
  queueStatus: ExecutiveDashboardData["charts"]["queueStatus"];
};

export type RevenueChartDays = 7 | 14 | 30;

function buildRevenueChartSeries(
  days: number,
  payments: { amount?: number | null; method?: string | null; paid_at?: string | null }[],
  bills: { created_at?: string | null }[]
) {
  const formatKey = (date: Date) => date.toISOString().split("T")[0];
  const revenueByDay = new Map<string, { date: string; revenue: number; invoices: number }>();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = formatKey(date);
    revenueByDay.set(key, {
      date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: 0,
      invoices: 0,
    });
  }

  const methodTotals = new Map<string, number>();

  for (const payment of payments) {
    if (!payment.paid_at) continue;
    const key = String(payment.paid_at).split("T")[0];
    const day = revenueByDay.get(key);
    if (day) day.revenue += Number(payment.amount ?? 0);

    const method = String(payment.method ?? "other").replace(/_/g, " ");
    methodTotals.set(method, (methodTotals.get(method) ?? 0) + Number(payment.amount ?? 0));
  }

  for (const bill of bills) {
    if (!bill.created_at) continue;
    const key = String(bill.created_at).split("T")[0];
    const day = revenueByDay.get(key);
    if (day) day.invoices += 1;
  }

  return {
    dailyRevenue: Array.from(revenueByDay.values()),
    paymentMix: Array.from(methodTotals.entries()).map(([method, amount]) => ({ method, amount })),
  };
}

async function getDailyRevenueSeries(clinicIds: string[], days: number) {
  const { payments, bills } = await fetchRevenueChartPayments(clinicIds, days);
  return buildRevenueChartSeries(days, payments, bills).dailyRevenue;
}

function buildWeeklyPatients(
  patients: { created_at?: string | null }[],
  visits: { created_at?: string | null; patient_id: string }[]
) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: { day: string; new: number; returning: number; total: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    const dayLabel = days[date.getDay()];

    const newCount = patients.filter((p) => String(p.created_at).startsWith(key)).length;
    const dayVisits = visits.filter((v) => String(v.created_at).startsWith(key));
    const visitPatientIds = dayVisits.map((v) => v.patient_id);
    const uniquePatients = new Set(visitPatientIds).size;
    const returning = Math.max(0, uniquePatients - newCount);

    result.push({
      day: dayLabel,
      new: newCount,
      returning,
      total: uniquePatients,
    });
  }

  return result;
}

function buildSparkline(values: number[]) {
  return values.length > 0 ? values : [0, 0, 0, 0, 0, 0, 0];
}

function buildCalendarDays(appointmentCounts: Map<string, number>) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = today.toISOString().split("T")[0];

  const days: { date: string; day: number; isToday: boolean; appointmentCount: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = date.toISOString().split("T")[0];
    days.push({
      date: key,
      day: d,
      isToday: key === todayStr,
      appointmentCount: appointmentCounts.get(key) ?? 0,
    });
  }
  return { days, firstDayOffset: firstDay.getDay() };
}

async function getDashboardExtras(clinicIds: string[]) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const [
    { data: appointments },
    { data: doctors },
    { data: schedules },
    { data: activeConsults },
    { data: auditLogs },
    { data: weekPatients },
    { data: weekVisits },
    { data: monthAppointments },
    { count: totalPatients },
    { count: totalConsultations },
    { count: prevMonthConsultations },
    { data: prevMonthPayments },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, appointment_date, appointment_time, status, reason, patients(full_name), doctors(profiles(full_name))")
      .in("clinic_id", clinicIds)
      .gte("appointment_date", today)
      .order("appointment_date")
      .order("appointment_time")
      .limit(8),
    supabase
      .from("doctors")
      .select("id, specialization, profiles(full_name)")
      .in("clinic_id", clinicIds),
    supabase
      .from("doctor_schedules")
      .select("doctor_id, day_of_week, start_time, end_time")
      .in("clinic_id", clinicIds),
    supabase
      .from("consultations")
      .select("doctor_id")
      .in("clinic_id", clinicIds)
      .eq("status", "in_progress"),
    supabase
      .from("audit_logs")
      .select("id, action, details, created_at")
      .in("clinic_id", clinicIds)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("patients")
      .select("created_at")
      .in("clinic_id", clinicIds)
      .gte("created_at", `${weekAgoStr}T00:00:00`),
    supabase
      .from("emr_records")
      .select("created_at, patient_id")
      .in("clinic_id", clinicIds)
      .gte("created_at", `${weekAgoStr}T00:00:00`),
    supabase
      .from("appointments")
      .select("appointment_date")
      .in("clinic_id", clinicIds)
      .gte("appointment_date", monthStartStr),
    supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .in("clinic_id", clinicIds)
      .eq("is_active", true),
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .in("clinic_id", clinicIds)
      .gte("started_at", `${monthStartStr}T00:00:00`),
    supabase
      .from("consultations")
      .select("id", { count: "exact", head: true })
      .in("clinic_id", clinicIds)
      .gte("started_at", `${new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1).toISOString().split("T")[0]}T00:00:00`)
      .lt("started_at", `${monthStartStr}T00:00:00`),
    supabase
      .from("payments")
      .select("amount, paid_at")
      .in("clinic_id", clinicIds)
      .eq("status", "completed")
      .gte("paid_at", `${new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1).toISOString().split("T")[0]}T00:00:00`)
      .lt("paid_at", `${monthStartStr}T00:00:00`),
  ]);

  const activeDoctorIds = new Set((activeConsults ?? []).map((c) => c.doctor_id));
  const todayDow = new Date().getDay();

  const doctorList: DashboardDoctor[] = (doctors ?? []).slice(0, 6).map((doc) => {
    const profile = doc.profiles as unknown as { full_name: string } | { full_name: string }[] | null;
    const name = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name ?? "Doctor";
    const docSchedules = (schedules ?? []).filter((s) => s.doctor_id === doc.id && s.day_of_week === todayDow);
    const isAvailable = activeDoctorIds.has(doc.id) || docSchedules.length > 0;
    const shift = docSchedules[0];

    return {
      id: doc.id,
      name,
      specialization: doc.specialization,
      isAvailable,
      shiftLabel: shift ? "Morning Shift" : "Off Duty",
      shiftTime: shift ? `${shift.start_time?.slice(0, 5)} - ${shift.end_time?.slice(0, 5)}` : "Not scheduled",
      avatarInitials: name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    };
  });

  const appointmentList: DashboardAppointment[] = (appointments ?? []).map((apt) => {
    const patient = apt.patients as unknown as { full_name: string } | null;
    const doctor = apt.doctors as unknown as { profiles: { full_name: string } | { full_name: string }[] } | null;
    const docProfile = doctor?.profiles;
    const doctorName = Array.isArray(docProfile) ? docProfile[0]?.full_name : docProfile?.full_name ?? "—";

    return {
      id: apt.id,
      patientName: patient?.full_name ?? "—",
      doctorName,
      date: apt.appointment_date,
      time: apt.appointment_time?.slice(0, 5) ?? "—",
      status: apt.status,
      reason: apt.reason,
    };
  });

  const activityTypeMap: Record<string, DashboardActivity["type"]> = {
    appointment_created: "appointment",
    appointment_updated: "appointment",
    payment_received: "payment",
    patient_created: "patient",
    queue_token_created: "queue",
  };

  const recentActivity: DashboardActivity[] = (auditLogs ?? []).map((log) => ({
    id: log.id,
    action: log.action.replace(/_/g, " "),
    description: typeof log.details === "object" && log.details !== null
      ? String((log.details as Record<string, unknown>).summary ?? log.action)
      : log.action,
    time: log.created_at,
    type: activityTypeMap[log.action] ?? "system",
  }));

  const appointmentCounts = new Map<string, number>();
  for (const apt of monthAppointments ?? []) {
    const key = apt.appointment_date;
    appointmentCounts.set(key, (appointmentCounts.get(key) ?? 0) + 1);
  }
  const { days: calendarDays } = buildCalendarDays(appointmentCounts);

  const weeklyPatients = buildWeeklyPatients(weekPatients ?? [], weekVisits ?? []);

  const prevMonthRevenue = (prevMonthPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return {
    appointments: appointmentList,
    doctors: doctorList,
    recentActivity,
    calendarDays,
    weeklyPatients,
    totalPatients: totalPatients ?? 0,
    totalConsultations: totalConsultations ?? 0,
    prevMonthConsultations: prevMonthConsultations ?? 0,
    prevMonthRevenue,
  };
}

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

async function fetchRevenueChartPayments(clinicIds: string[], days: number) {
  const supabase = await createClient();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
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
      .select("created_at")
      .in("clinic_id", clinicIds)
      .gte("created_at", start.toISOString()),
  ]);

  return { payments: payments ?? [], bills: bills ?? [] };
}

function assembleChartData(
  days: number,
  payments: { amount?: number | null; method?: string | null; paid_at?: string | null }[],
  bills: { created_at?: string | null }[],
  growth: { newPatients: number; returningPatients: number; lostPatients: number },
  operations: { activeDoctors: number; totalDoctors: number; patientsWaiting: number; queueInService: number; queueCompletedToday: number },
  business: { revenueThisMonth: number; outstandingPayments: number },
  weeklyPatients: { day: string; new: number; returning: number; total: number }[]
) {
  const { dailyRevenue, paymentMix } = buildRevenueChartSeries(days, payments, bills);
  const idleDoctors = Math.max(0, operations.totalDoctors - operations.activeDoctors);

  return {
    dailyRevenue,
    paymentMix,
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
    weeklyPatients,
    sparklineRevenue: buildSparkline(dailyRevenue.map((d) => d.revenue)),
    sparklinePatients: buildSparkline(weeklyPatients.map((d) => d.total)),
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
    { data: recentVisits },
    { data: historicalVisits },
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
      .gte("created_at", `${ninetyStr}T00:00:00`),
    supabase
      .from("emr_records")
      .select("patient_id")
      .in("clinic_id", clinicIds)
      .gte("created_at", `${yearAgoStr}T00:00:00`)
      .lt("created_at", `${ninetyStr}T00:00:00`),
    supabase
      .from("patients")
      .select("id")
      .in("clinic_id", clinicIds)
      .eq("is_active", true)
      .lt("created_at", ninetyStr),
  ]);

  const recentVisitCounts = new Map<string, number>();
  for (const visit of recentVisits ?? []) {
    recentVisitCounts.set(visit.patient_id, (recentVisitCounts.get(visit.patient_id) ?? 0) + 1);
  }
  const returningPatients = [...recentVisitCounts.values()].filter((count) => count >= 2).length;

  const recentPatientIds = new Set((recentVisits ?? []).map((visit) => visit.patient_id));
  const historicalPatientIds = new Set((historicalVisits ?? []).map((visit) => visit.patient_id));
  const lostPatients = (oldPatients ?? []).filter(
    (patient) => historicalPatientIds.has(patient.id) && !recentPatientIds.has(patient.id)
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

export async function getDashboardDailyRevenue(
  clinicId: string,
  days: RevenueChartDays = 14
): Promise<ExecutiveDashboardData["charts"]["dailyRevenue"]> {
  await requireRole(["clinic_owner"]);
  const clinicIds = await getOwnerClinicIds(clinicId);
  return getDailyRevenueSeries(clinicIds, days);
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

  const chartDays = 14;
  const chartPaymentsPromise = fetchRevenueChartPayments(clinicIds, chartDays);

  const [
    revenueResults,
    operations,
    growth,
    primaryInsights,
    healthRisks,
    followUps,
    lowPerformingBranch,
    chartPayments,
    extras,
  ] = await Promise.all([
    Promise.all(clinicIds.map((id) => getRevenueStats(id))),
    getOperationsMetrics(clinicIds),
    getGrowthMetrics(clinicIds),
    getAIBillingInsights(clinicId).catch(() => []),
    getHealthRiskFlags(clinicId).catch(() => []),
    getFollowUpTasks(clinicId).catch(() => []),
    isFranchise ? getLowPerformingBranch(clinicIds) : Promise.resolve(null),
    chartPaymentsPromise,
    getDashboardExtras(clinicIds),
  ]);

  const revenueToday = revenueResults.reduce((sum, rev) => sum + rev.todayRevenue, 0);
  const revenueThisMonth = revenueResults.reduce((sum, rev) => sum + rev.monthRevenue, 0);
  const outstandingPayments = revenueResults.reduce((sum, rev) => sum + rev.unpaidTotal, 0);
  const outstandingCount = revenueResults.reduce((sum, rev) => sum + rev.unpaidCount, 0);

  const revenueGrowth =
    extras.prevMonthRevenue > 0
      ? ((revenueThisMonth - extras.prevMonthRevenue) / extras.prevMonthRevenue) * 100
      : 0;
  const patientGrowth =
    extras.totalPatients > 0
      ? (growth.newPatients / extras.totalPatients) * 100
      : 0;
  const consultationGrowth =
    extras.prevMonthConsultations > 0
      ? ((extras.totalConsultations - extras.prevMonthConsultations) / extras.prevMonthConsultations) * 100
      : 0;

  const pendingFollowUps = followUps.filter(
    (f) => !["adherence_yes", "adherence_no"].includes(f.status)
  ).length;

  const business = {
    revenueToday,
    revenueThisMonth,
    outstandingPayments,
    outstandingCount,
    revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    patientGrowth: Math.round(patientGrowth * 100) / 100,
    consultationGrowth: Math.round(consultationGrowth * 100) / 100,
  };

  const operationsWithTotals = {
    ...operations,
    totalPatients: extras.totalPatients,
    totalConsultations: extras.totalConsultations,
  };

  const charts = assembleChartData(
    chartDays,
    chartPayments.payments,
    chartPayments.bills,
    growth,
    operations,
    business,
    extras.weeklyPatients
  );

  return {
    business,
    operations: operationsWithTotals,
    growth,
    aiInsights: {
      revenueLeak: primaryInsights.filter((i) => i.type === "missing_bill" || i.type === "unpaid_invoice").length,
      followUpOpportunities: pendingFollowUps,
      highRiskPatients: healthRisks.length,
      lowPerformingBranch,
    },
    charts,
    appointments: extras.appointments,
    doctors: extras.doctors,
    recentActivity: extras.recentActivity,
    calendarDays: extras.calendarDays,
    isFranchise,
    branchCount: clinicIds.length,
  };
}
