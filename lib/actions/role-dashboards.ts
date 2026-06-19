"use server";

import { createClient } from "@/lib/supabase/server";
import { getRevenueStats } from "@/lib/actions/billing";

export async function getReceptionistDashboard(clinicId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: session },
    { count: waiting },
    { count: arrived },
    { count: upcoming },
    { count: walkIns },
    revenue,
  ] = await Promise.all([
    supabase
      .from("queue_sessions")
      .select("current_token, id")
      .eq("clinic_id", clinicId)
      .eq("session_date", today)
      .maybeSingle(),
    supabase
      .from("queue_tokens")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("status", "waiting"),
    supabase
      .from("queue_tokens")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .in("status", ["called", "serving"]),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("appointment_date", today)
      .in("status", ["pending", "confirmed"]),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("appointment_date", today)
      .eq("type", "walk_in"),
    getRevenueStats(clinicId),
  ]);

  const { data: currentToken } = await supabase
    .from("queue_tokens")
    .select("token_label, token_number")
    .eq("clinic_id", clinicId)
    .eq("token_number", session?.current_token ?? -1)
    .eq("session_id", session?.id ?? "")
    .maybeSingle();

  const tokenDisplay =
    currentToken?.token_label ??
    (session?.current_token ? `#${session.current_token}` : "—");

  return {
    currentToken: tokenDisplay,
    waiting: waiting ?? 0,
    arrived: arrived ?? 0,
    upcoming: upcoming ?? 0,
    walkIns: walkIns ?? 0,
    revenueToday: revenue.todayRevenue,
    unpaidBills: revenue.unpaidCount,
  };
}

export async function getDoctorDashboard(clinicId: string, doctorId: string | null) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: todayPatients },
    { data: activeConsult },
    { data: nextToken },
    { count: pendingReports },
    { count: followUps },
  ] = await Promise.all([
    doctorId
      ? supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("doctor_id", doctorId)
          .eq("appointment_date", today)
      : Promise.resolve({ count: 0 }),
    doctorId
      ? supabase
          .from("consultations")
          .select("id, patients(full_name)")
          .eq("doctor_id", doctorId)
          .eq("status", "in_progress")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("queue_tokens")
      .select("token_label, token_number, patients(full_name)")
      .eq("clinic_id", clinicId)
      .eq("status", "waiting")
      .order("token_number")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("lab_orders")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .in("status", ["ordered", "sample_collected", "processing"]),
    supabase
      .from("follow_up_tasks")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("status", "pending"),
  ]);

  const activePatient = activeConsult?.patients as { full_name: string } | { full_name: string }[] | null;
  const currentPatient = Array.isArray(activePatient)
    ? activePatient[0]?.full_name
    : activePatient?.full_name ?? "—";
  const nextPatientLabel = nextToken
    ? nextToken.token_label ?? `A-${nextToken.token_number}`
    : "—";

  return {
    todayPatients: todayPatients ?? 0,
    currentPatient,
    nextPatient: nextPatientLabel,
    pendingReports: pendingReports ?? 0,
    followUps: followUps ?? 0,
    activeConsultationId: activeConsult?.id ?? null,
  };
}

export async function getPatientDashboardSummary(patientId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: upcomingAppt },
    { count: prescriptionCount },
    { count: labCount },
    { count: unpaidInvoices },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("appointment_date, appointment_time, status")
      .eq("patient_id", patientId)
      .gte("appointment_date", today)
      .in("status", ["pending", "confirmed"])
      .order("appointment_date")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("prescriptions")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId),
    supabase
      .from("lab_orders")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId)
      .eq("status", "completed"),
    supabase
      .from("bills")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patientId)
      .in("status", ["unpaid", "partial"]),
  ]);

  return {
    upcomingAppointment: upcomingAppt,
    prescriptionCount: prescriptionCount ?? 0,
    labReportCount: labCount ?? 0,
    unpaidInvoices: unpaidInvoices ?? 0,
  };
}
