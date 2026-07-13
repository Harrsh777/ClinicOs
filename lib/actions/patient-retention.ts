"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { generateRetentionMessage } from "@/lib/ai/retention-message";
import { scheduleEngagementReminder } from "@/lib/actions/follow-up-reminders";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { todayStr } from "@/lib/engagement/schedule";
import type { EngagementReminderType } from "@/lib/engagement/types";
import { REMINDER_TYPE_LABELS } from "@/lib/engagement/types";
import type {
  RetentionDashboardData,
  RetentionPatientRow,
  RetentionReason,
} from "@/lib/retention/types";

type EmrSummary = {
  symptoms?: string;
  diagnosis?: string;
  doctor?: string;
  follow_up_date?: string;
};

function daysBetween(from: string | null | undefined): number | null {
  if (!from) return null;
  const ms = Date.now() - new Date(from).getTime();
  return Math.floor(ms / 86400000);
}

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function inferReminderType(
  diagnosis: string | null,
  complaint: string | null,
  reasons: RetentionReason[]
): EngagementReminderType {
  if (reasons.includes("inactive_patient")) return "inactive_patient";
  if (reasons.includes("medicine_reminder")) return "medicine";
  if (reasons.includes("vaccination_due")) return "vaccination";

  const text = `${diagnosis ?? ""} ${complaint ?? ""}`.toLowerCase();
  if (/diabet|sugar|hba1c|glucose/.test(text)) return "diabetes_review";
  if (/hypertens|blood pressure|\bbp\b|htn/.test(text)) return "bp_review";
  if (/physio|fracture|sprain|ortho/.test(text)) return "physiotherapy";
  if (/pregnan|antenatal|prenatal/.test(text)) return "pregnancy";
  if (/vaccin|immuniz|booster/.test(text)) return "vaccination";

  return "clinical_follow_up";
}

function extractVisitContext(summary: EmrSummary | null) {
  const diagnosis = summary?.diagnosis?.trim() || null;
  const complaint = summary?.symptoms?.trim() || null;
  const visitReason = complaint || diagnosis || "General consultation";
  return {
    diagnosis,
    complaint,
    visitReason,
    doctorName: summary?.doctor?.trim() || null,
    followUpDate: summary?.follow_up_date || null,
  };
}

function buildRetentionReasons(params: {
  daysSinceVisit: number | null;
  hasPriorVisit: boolean;
  overdueFollowUp: boolean;
  activeMedicineReminder: boolean;
  doctorAttention: boolean;
  noResponse: boolean;
  vaccinationHint: boolean;
}): RetentionReason[] {
  const reasons: RetentionReason[] = [];
  if (params.overdueFollowUp) reasons.push("overdue_follow_up");
  if (params.hasPriorVisit && params.daysSinceVisit !== null && params.daysSinceVisit >= 90) {
    reasons.push("inactive_patient");
  }
  if (params.activeMedicineReminder) reasons.push("medicine_reminder");
  if (params.doctorAttention) reasons.push("doctor_attention");
  if (params.noResponse) reasons.push("no_response");
  if (params.vaccinationHint) reasons.push("vaccination_due");
  return reasons;
}

export async function getRetentionDashboardData(
  clinicId: string
): Promise<RetentionDashboardData> {
  const supabase = await createClient();
  const today = todayStr();
  const monthStartStr = monthStart();

  const [{ data: clinic }, { data: patients }, { data: emrRows }, { data: reminders }] =
    await Promise.all([
      supabase.from("clinics").select("name").eq("id", clinicId).single(),
      supabase
        .from("patients")
        .select("id, full_name, phone, last_visit_at, created_at")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("emr_records")
        .select("patient_id, summary, created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false }),
      supabase
        .from("follow_up_reminders")
        .select(
          "id, patient_id, follow_up_date, reminder_type, status, diagnosis, complaint, doctor_name, patient_response, recovery_analysis, created_at, send_on_date"
        )
        .eq("clinic_id", clinicId)
        .not("status", "in", '("completed","cancelled")')
        .order("created_at", { ascending: false }),
    ]);

  const latestEmrByPatient = new Map<string, EmrSummary>();
  for (const row of emrRows ?? []) {
    if (!latestEmrByPatient.has(row.patient_id)) {
      latestEmrByPatient.set(row.patient_id, (row.summary ?? {}) as EmrSummary);
    }
  }

  const remindersByPatient = new Map<string, NonNullable<typeof reminders>>();
  for (const r of reminders ?? []) {
    const list = remindersByPatient.get(r.patient_id) ?? [];
    list.push(r);
    remindersByPatient.set(r.patient_id, list);
  }

  const retentionPatients: RetentionPatientRow[] = [];
  let overdueThisMonth = 0;
  let inactivePatients = 0;
  let doctorAttention = 0;
  let readyToSend = 0;
  let totalAtRisk = 0;

  for (const patient of patients ?? []) {
    const emr = latestEmrByPatient.get(patient.id);
    const ctx = extractVisitContext(emr ?? null);
    const daysSinceVisit = daysBetween(patient.last_visit_at);
    const hasPriorVisit = Boolean(patient.last_visit_at || emr);
    if (!hasPriorVisit) continue;

    const patientReminders = remindersByPatient.get(patient.id) ?? [];

    const primaryReminder = patientReminders[0] ?? null;
    const overdueFollowUp = patientReminders.some(
      (r) =>
        r.follow_up_date < today &&
        ["scheduled", "sent", "delivered", "read"].includes(r.status)
    );
    const overdueThisMonthPatient = patientReminders.some(
      (r) =>
        r.follow_up_date >= monthStartStr &&
        r.follow_up_date < today &&
        ["scheduled", "sent", "delivered", "read"].includes(r.status)
    );
    const activeMedicineReminder = patientReminders.some(
      (r) => r.reminder_type === "medicine" && r.status === "scheduled"
    );
    const attentionReminder = patientReminders.find(
      (r) =>
        (r.recovery_analysis as { doctor_attention_required?: boolean } | null)
          ?.doctor_attention_required
    );
    const noResponseReminder = patientReminders.find(
      (r) =>
        ["sent", "delivered", "read"].includes(r.status) &&
        !r.patient_response &&
        daysBetween(r.created_at) !== null &&
        (daysBetween(r.created_at) ?? 0) >= 3
    );

    const vaccinationHint = /vaccin|immuniz|booster|flu shot|tetanus|hepatitis/i.test(
      `${ctx.diagnosis ?? ""} ${ctx.complaint ?? ""}`
    );

    const emrFollowUpOverdue = Boolean(
      ctx.followUpDate && ctx.followUpDate < today && daysSinceVisit !== null && daysSinceVisit > 0
    );

    const chronicText = `${ctx.diagnosis ?? ""} ${ctx.complaint ?? ""}`.toLowerCase();
    const chronicCondition = /diabet|hypertens|blood pressure|\bbp\b|asthma|thyroid|heart/.test(
      chronicText
    );
    const chronicReviewDue =
      chronicCondition && daysSinceVisit !== null && daysSinceVisit >= 60;

    const retentionReasons = buildRetentionReasons({
      daysSinceVisit,
      hasPriorVisit,
      overdueFollowUp: overdueFollowUp || emrFollowUpOverdue || chronicReviewDue,
      activeMedicineReminder,
      doctorAttention: Boolean(attentionReminder),
      noResponse: Boolean(noResponseReminder),
      vaccinationHint,
    });

    const suggestedReminderType = inferReminderType(
      primaryReminder?.diagnosis ?? ctx.diagnosis,
      primaryReminder?.complaint ?? ctx.complaint,
      retentionReasons
    );

    if (retentionReasons.length) totalAtRisk++;

    if (overdueThisMonthPatient || retentionReasons.includes("overdue_follow_up")) {
      overdueThisMonth++;
    }
    if (retentionReasons.includes("inactive_patient")) inactivePatients++;
    if (retentionReasons.includes("doctor_attention")) doctorAttention++;
    if (
      patientReminders.some(
        (r) => r.status === "scheduled" && (!r.send_on_date || r.send_on_date <= today)
      )
    ) {
      readyToSend++;
    }

    retentionPatients.push({
      patientId: patient.id,
      patientName: patient.full_name,
      patientPhone: patient.phone,
      lastVisitAt: patient.last_visit_at,
      daysSinceVisit,
      visitReason: ctx.visitReason,
      complaint: primaryReminder?.complaint ?? ctx.complaint,
      lastDiagnosis: primaryReminder?.diagnosis ?? ctx.diagnosis,
      doctorName: primaryReminder?.doctor_name ?? ctx.doctorName,
      retentionReasons,
      reminderId: primaryReminder?.id ?? null,
      reminderType: (primaryReminder?.reminder_type as EngagementReminderType) ?? null,
      followUpDate: primaryReminder?.follow_up_date ?? ctx.followUpDate,
      reminderStatus: primaryReminder?.status ?? null,
      suggestedReminderType,
    });
  }

  retentionPatients.sort((a, b) => {
    const priority = (r: RetentionPatientRow) =>
      (r.retentionReasons.length ? 10000 : 0) +
      (r.retentionReasons.includes("doctor_attention") ? 1000 : 0) +
      (r.retentionReasons.includes("overdue_follow_up") ? 500 : 0) +
      (r.daysSinceVisit ?? 0);
    return priority(b) - priority(a);
  });

  return {
    clinicName: clinic?.name ?? "Your clinic",
    stats: {
      totalVisited: retentionPatients.length,
      overdueThisMonth,
      inactivePatients,
      doctorAttention,
      readyToSend,
      totalAtRisk,
    },
    patients: retentionPatients,
  };
}

export async function getRetentionDashboardAction(): Promise<RetentionDashboardData | null> {
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return null;
  return getRetentionDashboardData(profile.clinic_id);
}

export async function generateRetentionMessageAction(params: {
  patientId: string;
  reminderType?: EngagementReminderType;
  customInstructions?: string;
}): Promise<{ message?: string; error?: string }> {
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, phone, last_visit_at")
    .eq("id", params.patientId)
    .eq("clinic_id", profile.clinic_id)
    .single();

  if (!patient) return { error: "Patient not found" };

  const { data: emr } = await supabase
    .from("emr_records")
    .select("summary")
    .eq("patient_id", params.patientId)
    .eq("clinic_id", profile.clinic_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name")
    .eq("id", profile.clinic_id)
    .single();

  const ctx = extractVisitContext((emr?.summary ?? {}) as EmrSummary);
  const reminderType = params.reminderType ?? "clinical_follow_up";

  const { message } = await generateRetentionMessage(profile.clinic_id, {
    patientName: patient.full_name,
    visitReason: ctx.visitReason,
    complaint: ctx.complaint,
    diagnosis: ctx.diagnosis,
    doctorName: ctx.doctorName,
    followUpDate: ctx.followUpDate,
    clinicName: clinic?.name ?? "the clinic",
    reminderType,
    daysSinceVisit: daysBetween(patient.last_visit_at),
    customInstructions: params.customInstructions,
  });

  return { message };
}

async function ensureReminderAndSend(params: {
  clinicId: string;
  patient: { id: string; full_name: string; phone: string; last_visit_at: string | null };
  message: string;
  reminderType: EngagementReminderType;
  diagnosis?: string | null;
  complaint?: string | null;
  doctorName?: string | null;
  existingReminderId?: string | null;
}) {
  const service = await createServiceClient();
  let reminderId = params.existingReminderId;

  if (!reminderId) {
    const targetDate = todayStr();
    const scheduled = await scheduleEngagementReminder({
      clinicId: params.clinicId,
      patientId: params.patient.id,
      patientName: params.patient.full_name,
      patientPhone: params.patient.phone,
      targetDate,
      reminderType: params.reminderType,
      scheduleRule: "custom",
      customSendOnDate: targetDate,
      diagnosis: params.diagnosis,
      complaint: params.complaint,
      doctorName: params.doctorName,
      context: { source: "retention_dashboard", manual: true },
    });
    if (scheduled.error) return { success: false, error: scheduled.error };

    const { data: created } = await service
      .from("follow_up_reminders")
      .select("id")
      .eq("patient_id", params.patient.id)
      .eq("clinic_id", params.clinicId)
      .eq("reminder_type", params.reminderType)
      .eq("status", "scheduled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    reminderId = created?.id ?? null;
  }

  const result = await sendWhatsAppMessage({
    clinicId: params.clinicId,
    patientId: params.patient.id,
    patientPhone: params.patient.phone,
    content: params.message,
    intent: "retention_reminder",
    metadata: {
      followUpReminderId: reminderId,
      reminderType: params.reminderType,
      source: "retention_dashboard",
    },
  });

  if (reminderId) {
    await service
      .from("follow_up_reminders")
      .update({
        status: result.success ? "sent" : "failed",
        ai_message: params.message,
        whatsapp_message_id: result.messageId ?? null,
        send_on_date: todayStr(),
      })
      .eq("id", reminderId);
  }

  return {
    success: result.success,
    error: result.error,
    simulated: result.simulated,
  };
}

export async function sendRetentionMessageAction(params: {
  patientId: string;
  message: string;
  reminderType?: EngagementReminderType;
  reminderId?: string | null;
}): Promise<{ success?: boolean; error?: string; simulated?: boolean }> {
  await requireAuth();
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  if (!params.message.trim()) return { error: "Message cannot be empty" };

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, phone, last_visit_at")
    .eq("id", params.patientId)
    .eq("clinic_id", profile.clinic_id)
    .single();

  if (!patient) return { error: "Patient not found" };

  const { data: emr } = await supabase
    .from("emr_records")
    .select("summary")
    .eq("patient_id", params.patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ctx = extractVisitContext((emr?.summary ?? {}) as EmrSummary);

  const result = await ensureReminderAndSend({
    clinicId: profile.clinic_id,
    patient,
    message: params.message.trim(),
    reminderType: params.reminderType ?? "clinical_follow_up",
    diagnosis: ctx.diagnosis,
    complaint: ctx.complaint,
    doctorName: ctx.doctorName,
    existingReminderId: params.reminderId,
  });

  revalidatePath("/owner/retention");
  revalidatePath("/doctor/retention");
  revalidatePath("/receptionist/retention");

  if (!result.success) return { error: result.error ?? "Failed to send message" };
  return { success: true, simulated: result.simulated };
}

export async function sendBulkRetentionMessagesAction(params: {
  patientIds: string[];
  useAi?: boolean;
  customInstructions?: string;
}): Promise<{
  sent: number;
  failed: number;
  errors: string[];
  simulated?: boolean;
}> {
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { sent: 0, failed: 0, errors: ["No clinic assigned"] };

  const dashboard = await getRetentionDashboardData(profile.clinic_id);
  const targetSet = new Set(params.patientIds);
  const targets = dashboard.patients.filter((p) => targetSet.has(p.patientId));

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  let anySimulated = false;

  const supabase = await createClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name")
    .eq("id", profile.clinic_id)
    .single();

  for (const row of targets) {
    let message: string;

    if (params.useAi !== false) {
      const generated = await generateRetentionMessage(profile.clinic_id, {
        patientName: row.patientName,
        visitReason: row.visitReason,
        complaint: row.complaint,
        diagnosis: row.lastDiagnosis,
        doctorName: row.doctorName,
        followUpDate: row.followUpDate,
        clinicName: clinic?.name ?? "the clinic",
        reminderType: row.suggestedReminderType,
        daysSinceVisit: row.daysSinceVisit,
        customInstructions: params.customInstructions,
      });
      message = generated.message;
    } else if (params.customInstructions?.trim()) {
      message = params.customInstructions.trim();
    } else {
      message = `Hello ${row.patientName.split(" ")[0]}, this is ${clinic?.name ?? "your clinic"}. It's time for your ${REMINDER_TYPE_LABELS[row.suggestedReminderType].toLowerCase()}. Please book a visit when convenient.`;
    }

    const { data: patient } = await supabase
      .from("patients")
      .select("id, full_name, phone, last_visit_at")
      .eq("id", row.patientId)
      .single();

    if (!patient) {
      failed++;
      errors.push(`${row.patientName}: patient not found`);
      continue;
    }

    const result = await ensureReminderAndSend({
      clinicId: profile.clinic_id,
      patient,
      message,
      reminderType: row.suggestedReminderType,
      diagnosis: row.lastDiagnosis,
      complaint: row.complaint ?? row.visitReason,
      doctorName: row.doctorName,
      existingReminderId: row.reminderId,
    });

    if (result.success) {
      sent++;
      if (result.simulated) anySimulated = true;
    } else {
      failed++;
      errors.push(`${row.patientName}: ${result.error ?? "send failed"}`);
    }
  }

  revalidatePath("/owner/retention");
  revalidatePath("/doctor/retention");
  revalidatePath("/receptionist/retention");

  return { sent, failed, errors, simulated: anySimulated };
}
