"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { generateRetentionMessage } from "@/lib/ai/retention-message";
import { generateRetentionEmail } from "@/lib/ai/retention-email";
import { sendEmail, type EmailAttachmentInput } from "@/lib/email/send";
import { buildRetentionEmailHtml, plainTextToEmailHtml } from "@/lib/email/retention-template";
import { scheduleEngagementReminder } from "@/lib/actions/follow-up-reminders";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { todayStr } from "@/lib/engagement/schedule";
import type { EngagementReminderType } from "@/lib/engagement/types";
import { REMINDER_TYPE_LABELS } from "@/lib/engagement/types";
import { generatePatientCode } from "@/lib/db/sequences";
import { validateIndianPhone } from "@/lib/validations/phone";
import { parseDueAmount, parseRetentionCsv, parseVisitDate } from "@/lib/retention/csv";
import type {
  RetentionDashboardData,
  RetentionPatientRow,
  RetentionReason,
} from "@/lib/retention/types";
import { z } from "zod";

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
  hasDues: boolean;
}): RetentionReason[] {
  const reasons: RetentionReason[] = [];
  if (params.overdueFollowUp) reasons.push("overdue_follow_up");
  if (params.hasPriorVisit && params.daysSinceVisit !== null && params.daysSinceVisit >= 180) {
    reasons.push("inactive_patient");
  }
  if (params.activeMedicineReminder) reasons.push("medicine_reminder");
  if (params.doctorAttention) reasons.push("doctor_attention");
  if (params.noResponse) reasons.push("no_response");
  if (params.vaccinationHint) reasons.push("vaccination_due");
  if (params.hasDues) reasons.push("has_dues");
  return reasons;
}

function computeBillDue(bill: {
  status: string;
  patient_amount: number | string;
  paid_amount: number | string;
  total_amount: number | string;
}): number {
  const patientAmount = Number(bill.patient_amount ?? 0);
  const paidAmount = Number(bill.paid_amount ?? 0);
  if (bill.status === "unpaid") {
    return Math.max(0, patientAmount > 0 ? patientAmount - paidAmount : Number(bill.total_amount) - paidAmount);
  }
  if (bill.status === "partial") {
    return Math.max(0, patientAmount - paidAmount);
  }
  return 0;
}

function resolveLastVisitAt(
  lastVisitAt: string | null,
  overrideDate: string | null
): string | null {
  if (overrideDate) return `${overrideDate}T00:00:00.000Z`;
  return lastVisitAt;
}

export async function getRetentionDashboardData(
  clinicId: string
): Promise<RetentionDashboardData> {
  const supabase = await createClient();
  const today = todayStr();
  const monthStartStr = monthStart();

  const [{ data: clinic }, { data: patients }, { data: emrRows }, { data: reminders }, { data: bills }] =
    await Promise.all([
      supabase.from("clinics").select("name").eq("id", clinicId).single(),
      supabase
        .from("patients")
        .select(
          "id, full_name, phone, email, last_visit_at, created_at, retention_visit_reason, retention_due_override, retention_last_visit_override"
        )
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
      supabase
        .from("bills")
        .select("patient_id, status, patient_amount, paid_amount, total_amount")
        .eq("clinic_id", clinicId)
        .in("status", ["unpaid", "partial"]),
    ]);

  const duesByPatient = new Map<string, number>();
  for (const bill of bills ?? []) {
    const due = computeBillDue(bill);
    if (due > 0) {
      duesByPatient.set(bill.patient_id, (duesByPatient.get(bill.patient_id) ?? 0) + due);
    }
  }

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
  let withDues = 0;
  let totalDues = 0;
  let totalVisited = 0;

  for (const patient of patients ?? []) {
    const emr = latestEmrByPatient.get(patient.id);
    const ctx = extractVisitContext(emr ?? null);
    const effectiveLastVisit = resolveLastVisitAt(
      patient.last_visit_at,
      patient.retention_last_visit_override
    );
    const daysSinceVisit = daysBetween(effectiveLastVisit);
    const hasPriorVisit = Boolean(effectiveLastVisit || emr || patient.retention_visit_reason);
    if (hasPriorVisit) totalVisited++;

    const dueFromBills = duesByPatient.get(patient.id) ?? 0;
    const hasDueOverride = patient.retention_due_override !== null;
    const dueAmount = hasDueOverride
      ? Number(patient.retention_due_override ?? 0)
      : dueFromBills;
    if (dueAmount > 0) {
      withDues++;
      totalDues += dueAmount;
    }

    const visitReason = patient.retention_visit_reason?.trim() || ctx.visitReason;

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
      hasDues: dueAmount > 0,
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
      patientEmail: patient.email?.trim() || null,
      lastVisitAt: effectiveLastVisit,
      daysSinceVisit,
      visitReason: hasPriorVisit ? visitReason : patient.retention_visit_reason?.trim() || "—",
      visitReasonEditable: true,
      complaint: primaryReminder?.complaint ?? ctx.complaint,
      lastDiagnosis: primaryReminder?.diagnosis ?? ctx.diagnosis,
      doctorName: primaryReminder?.doctor_name ?? ctx.doctorName,
      dueAmount,
      dueFromBills,
      hasDueOverride,
      retentionReasons,
      reminderId: primaryReminder?.id ?? null,
      reminderType: (primaryReminder?.reminder_type as EngagementReminderType) ?? null,
      followUpDate: primaryReminder?.follow_up_date ?? ctx.followUpDate,
      reminderStatus: primaryReminder?.status ?? null,
      suggestedReminderType,
      hasVisitHistory: hasPriorVisit,
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
      totalPatients: retentionPatients.length,
      totalVisited,
      withDues,
      totalDues,
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

const retentionEmailAttachmentSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().optional(),
  data: z.string().min(1),
});

const MAX_EMAIL_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

function parseRetentionEmailAttachments(
  attachments?: { filename: string; contentType?: string; data: string }[]
) {
  if (!attachments?.length) {
    return { attachments: [] as EmailAttachmentInput[], inlineCids: [] as string[] };
  }

  if (attachments.length > MAX_EMAIL_ATTACHMENTS) {
    return { error: `Maximum ${MAX_EMAIL_ATTACHMENTS} attachments allowed` };
  }

  const parsed: EmailAttachmentInput[] = [];
  const inlineCids: string[] = [];

  for (const [index, file] of attachments.entries()) {
    const validated = retentionEmailAttachmentSchema.safeParse(file);
    if (!validated.success) return { error: "Invalid attachment payload" };

    const buffer = Buffer.from(validated.data.data, "base64");
    if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
      return { error: `${validated.data.filename} exceeds 4 MB limit` };
    }

    const contentType = validated.data.contentType ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return { error: "Only image attachments are supported" };
    }

    const cid = `retention-img-${index + 1}`;
    parsed.push({
      filename: validated.data.filename,
      content: buffer,
      contentType,
      contentId: cid,
    });
    inlineCids.push(cid);
  }

  return { attachments: parsed, inlineCids };
}

async function loadRetentionPatientContext(patientId: string, clinicId: string) {
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, phone, email, last_visit_at")
    .eq("id", patientId)
    .eq("clinic_id", clinicId)
    .single();

  if (!patient) return { error: "Patient not found" as const };

  const { data: emr } = await supabase
    .from("emr_records")
    .select("summary")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name")
    .eq("id", clinicId)
    .single();

  return {
    patient,
    ctx: extractVisitContext((emr?.summary ?? {}) as EmrSummary),
    clinicName: clinic?.name ?? "Your clinic",
  };
}

function revalidateRetentionPaths() {
  revalidatePath("/owner/retention");
  revalidatePath("/doctor/retention");
  revalidatePath("/receptionist/retention");
}

export async function generateRetentionEmailAction(params: {
  patientId: string;
  reminderType?: EngagementReminderType;
  customInstructions?: string;
}): Promise<{ subject?: string; body?: string; error?: string }> {
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const loaded = await loadRetentionPatientContext(params.patientId, profile.clinic_id);
  if ("error" in loaded) return { error: loaded.error };

  const reminderType = params.reminderType ?? "clinical_follow_up";
  const generated = await generateRetentionEmail(profile.clinic_id, {
    patientName: loaded.patient.full_name,
    visitReason: loaded.ctx.visitReason,
    complaint: loaded.ctx.complaint,
    diagnosis: loaded.ctx.diagnosis,
    doctorName: loaded.ctx.doctorName,
    followUpDate: loaded.ctx.followUpDate,
    clinicName: loaded.clinicName,
    reminderType,
    daysSinceVisit: daysBetween(loaded.patient.last_visit_at),
    customInstructions: params.customInstructions,
  });

  return { subject: generated.subject, body: generated.body };
}

export async function sendRetentionEmailAction(params: {
  patientId: string;
  subject: string;
  body: string;
  attachments?: { filename: string; contentType?: string; data: string }[];
}): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  if (!params.subject.trim()) return { error: "Subject is required" };
  if (!params.body.trim()) return { error: "Email body cannot be empty" };

  const loaded = await loadRetentionPatientContext(params.patientId, profile.clinic_id);
  if ("error" in loaded) return { error: loaded.error };

  if (!loaded.patient.email) {
    return { error: "Patient has no email on file. Add their email in Patients first." };
  }

  const attachmentResult = parseRetentionEmailAttachments(params.attachments);
  if ("error" in attachmentResult) {
    return { error: attachmentResult.error ?? "Invalid attachments" };
  }

  const html = buildRetentionEmailHtml({
    clinicName: loaded.clinicName,
    patientName: loaded.patient.full_name,
    bodyHtml: plainTextToEmailHtml(params.body.trim()),
    inlineImageCids: attachmentResult.inlineCids,
  });

  const result = await sendEmail({
    to: loaded.patient.email,
    subject: params.subject.trim(),
    html,
    attachments: attachmentResult.attachments,
  });

  revalidateRetentionPaths();

  if (!result.ok) return { error: result.error };
  return { success: true };
}

export async function sendRetentionEmailBroadcastAction(params: {
  patientIds: string[];
  subject: string;
  body: string;
  attachments?: { filename: string; contentType?: string; data: string }[];
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { sent: 0, failed: 0, errors: ["No clinic assigned"] };

  if (!params.subject.trim()) return { sent: 0, failed: 0, errors: ["Subject is required"] };
  if (!params.body.trim()) return { sent: 0, failed: 0, errors: ["Email body cannot be empty"] };

  const attachmentResult = parseRetentionEmailAttachments(params.attachments);
  if ("error" in attachmentResult) {
    return { sent: 0, failed: 0, errors: [attachmentResult.error ?? "Invalid attachments"] };
  }

  const supabase = await createClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name")
    .eq("id", profile.clinic_id)
    .single();

  const clinicName = clinic?.name ?? "Your clinic";
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const patientId of params.patientIds) {
    const { data: patient } = await supabase
      .from("patients")
      .select("id, full_name, email")
      .eq("id", patientId)
      .eq("clinic_id", profile.clinic_id)
      .single();

    if (!patient) {
      failed++;
      errors.push(`Patient ${patientId} not found`);
      continue;
    }

    if (!patient.email) {
      failed++;
      errors.push(`${patient.full_name}: no email on file`);
      continue;
    }

    const html = buildRetentionEmailHtml({
      clinicName,
      patientName: patient.full_name,
      bodyHtml: plainTextToEmailHtml(params.body.trim()),
      inlineImageCids: attachmentResult.inlineCids,
    });

    const result = await sendEmail({
      to: patient.email,
      subject: params.subject.trim(),
      html,
      attachments: attachmentResult.attachments,
    });

    if (result.ok) sent++;
    else {
      failed++;
      errors.push(`${patient.full_name}: ${result.error}`);
    }
  }

  revalidateRetentionPaths();
  return { sent, failed, errors };
}

export async function sendBulkRetentionEmailsAction(params: {
  patientIds: string[];
  customInstructions?: string;
  attachments?: { filename: string; contentType?: string; data: string }[];
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { sent: 0, failed: 0, errors: ["No clinic assigned"] };

  const attachmentResult = parseRetentionEmailAttachments(params.attachments);
  if ("error" in attachmentResult) {
    return { sent: 0, failed: 0, errors: [attachmentResult.error ?? "Invalid attachments"] };
  }

  const dashboard = await getRetentionDashboardData(profile.clinic_id);
  const targetSet = new Set(params.patientIds);
  const targets = dashboard.patients.filter((p) => targetSet.has(p.patientId));

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of targets) {
    if (!row.patientEmail) {
      failed++;
      errors.push(`${row.patientName}: no email on file`);
      continue;
    }

    const generated = await generateRetentionEmail(profile.clinic_id, {
      patientName: row.patientName,
      visitReason: row.visitReason,
      complaint: row.complaint,
      diagnosis: row.lastDiagnosis,
      doctorName: row.doctorName,
      followUpDate: row.followUpDate,
      clinicName: dashboard.clinicName,
      reminderType: row.suggestedReminderType,
      daysSinceVisit: row.daysSinceVisit,
      customInstructions: params.customInstructions,
    });

    const html = buildRetentionEmailHtml({
      clinicName: dashboard.clinicName,
      patientName: row.patientName,
      bodyHtml: plainTextToEmailHtml(generated.body),
      inlineImageCids: attachmentResult.inlineCids,
    });

    const result = await sendEmail({
      to: row.patientEmail,
      subject: generated.subject,
      html,
      attachments: attachmentResult.attachments,
    });

    if (result.ok) sent++;
    else {
      failed++;
      errors.push(`${row.patientName}: ${result.error}`);
    }
  }

  revalidateRetentionPaths();
  return { sent, failed, errors };
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

const addRetentionPatientSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  visitReason: z.string().optional(),
  lastVisitDate: z.string().optional(),
  dueAmount: z.coerce.number().min(0).optional(),
});

export async function addRetentionPatientAction(input: {
  fullName: string;
  phone: string;
  visitReason?: string;
  lastVisitDate?: string;
  dueAmount?: number;
}): Promise<{ success?: boolean; patientId?: string; error?: string }> {
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const parsed = addRetentionPatientSchema.safeParse(input);
  if (!parsed.success) return { error: "Please provide name and phone" };

  const phoneResult = validateIndianPhone(parsed.data.phone);
  if ("error" in phoneResult) return { error: phoneResult.error };

  const supabase = await createClient();
  const service = await createServiceClient();

  const { data: existing } = await supabase
    .from("patients")
    .select("id")
    .eq("clinic_id", profile.clinic_id)
    .eq("phone", phoneResult.phone)
    .maybeSingle();

  if (existing) {
    return { error: "A patient with this phone number already exists. Edit them in the list instead." };
  }

  const patientCode = await generatePatientCode(service, profile.clinic_id);
  const visitDate = parsed.data.lastVisitDate
    ? parseVisitDate(parsed.data.lastVisitDate)
    : null;

  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: profile.clinic_id,
      full_name: parsed.data.fullName.trim(),
      phone: phoneResult.phone,
      patient_code: patientCode,
      created_by: profile.id,
      retention_visit_reason: parsed.data.visitReason?.trim() || null,
      retention_last_visit_override: visitDate,
      retention_due_override:
        parsed.data.dueAmount !== undefined ? parsed.data.dueAmount : null,
      last_visit_at: visitDate ? `${visitDate}T00:00:00.000Z` : null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/owner/retention");
  revalidatePath("/doctor/retention");
  revalidatePath("/receptionist/retention");
  revalidatePath("/owner/patients");

  return { success: true, patientId: data.id };
}

export async function importRetentionPatientsAction(csvText: string): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { imported: 0, skipped: 0, errors: ["No clinic assigned"] };

  const { rows, errors: parseErrors } = parseRetentionCsv(csvText);
  if (parseErrors.length && rows.length === 0) {
    return { imported: 0, skipped: 0, errors: parseErrors };
  }

  const supabase = await createClient();
  const service = await createServiceClient();
  let imported = 0;
  let skipped = 0;
  const errors = [...parseErrors];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const phoneResult = validateIndianPhone(row.phone);
    if ("error" in phoneResult) {
      errors.push(`Row ${i + 2}: ${phoneResult.error}`);
      skipped++;
      continue;
    }

    const { data: existing } = await supabase
      .from("patients")
      .select("id")
      .eq("clinic_id", profile.clinic_id)
      .eq("phone", phoneResult.phone)
      .maybeSingle();

    if (existing) {
      const visitDate = parseVisitDate(row.last_visit_date);
      const dueAmount = parseDueAmount(row.due_amount);

      const { error: updateError } = await supabase
        .from("patients")
        .update({
          full_name: row.full_name.trim(),
          retention_visit_reason: row.visit_reason?.trim() || null,
          retention_last_visit_override: visitDate,
          retention_due_override: dueAmount,
          ...(visitDate ? { last_visit_at: `${visitDate}T00:00:00.000Z` } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        errors.push(`Row ${i + 2}: ${updateError.message}`);
        skipped++;
      } else {
        imported++;
      }
      continue;
    }

    const patientCode = await generatePatientCode(service, profile.clinic_id);
    const visitDate = parseVisitDate(row.last_visit_date);
    const dueAmount = parseDueAmount(row.due_amount);

    const { error: insertError } = await supabase.from("patients").insert({
      clinic_id: profile.clinic_id,
      full_name: row.full_name.trim(),
      phone: phoneResult.phone,
      patient_code: patientCode,
      created_by: profile.id,
      retention_visit_reason: row.visit_reason?.trim() || null,
      retention_last_visit_override: visitDate,
      retention_due_override: dueAmount,
      last_visit_at: visitDate ? `${visitDate}T00:00:00.000Z` : null,
    });

    if (insertError) {
      errors.push(`Row ${i + 2}: ${insertError.message}`);
      skipped++;
    } else {
      imported++;
    }
  }

  revalidatePath("/owner/retention");
  revalidatePath("/doctor/retention");
  revalidatePath("/receptionist/retention");
  revalidatePath("/owner/patients");

  return { imported, skipped, errors };
}

export async function updateRetentionPatientFieldsAction(input: {
  patientId: string;
  fullName?: string;
  phone?: string;
  visitReason?: string;
  lastVisitDate?: string | null;
  dueAmount?: number | null;
}): Promise<{ success?: boolean; error?: string }> {
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.fullName !== undefined) {
    if (input.fullName.trim().length < 2) return { error: "Name is too short" };
    updates.full_name = input.fullName.trim();
  }

  if (input.phone !== undefined) {
    const phoneResult = validateIndianPhone(input.phone);
    if ("error" in phoneResult) return { error: phoneResult.error };
    updates.phone = phoneResult.phone;
  }

  if (input.visitReason !== undefined) {
    updates.retention_visit_reason = input.visitReason.trim() || null;
  }

  if (input.lastVisitDate !== undefined) {
    if (input.lastVisitDate === null || input.lastVisitDate === "") {
      updates.retention_last_visit_override = null;
    } else {
      const parsed = parseVisitDate(input.lastVisitDate);
      if (!parsed) return { error: "Invalid visit date" };
      updates.retention_last_visit_override = parsed;
      updates.last_visit_at = `${parsed}T00:00:00.000Z`;
    }
  }

  if (input.dueAmount !== undefined) {
    if (input.dueAmount === null) {
      updates.retention_due_override = null;
    } else if (input.dueAmount < 0) {
      return { error: "Due amount cannot be negative" };
    } else {
      updates.retention_due_override = input.dueAmount;
    }
  }

  const { error } = await supabase
    .from("patients")
    .update(updates)
    .eq("id", input.patientId)
    .eq("clinic_id", profile.clinic_id);

  if (error) {
    if (error.code === "23505") return { error: "Phone number already used by another patient" };
    return { error: error.message };
  }

  revalidatePath("/owner/retention");
  revalidatePath("/doctor/retention");
  revalidatePath("/receptionist/retention");

  return { success: true };
}

export async function sendRetentionBroadcastAction(params: {
  patientIds: string[];
  message: string;
}): Promise<{
  sent: number;
  failed: number;
  errors: string[];
  simulated?: boolean;
}> {
  const profile = await requireRole(["clinic_owner", "doctor", "receptionist"]);
  if (!profile.clinic_id) return { sent: 0, failed: 0, errors: ["No clinic assigned"] };

  const supabase = await createClient();
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  let anySimulated = false;

  for (const patientId of params.patientIds) {
    const { data: patient } = await supabase
      .from("patients")
      .select("id, full_name, phone")
      .eq("id", patientId)
      .eq("clinic_id", profile.clinic_id)
      .single();

    if (!patient) {
      failed++;
      errors.push(`Patient ${patientId} not found`);
      continue;
    }

    const result = await sendWhatsAppMessage({
      clinicId: profile.clinic_id,
      patientId: patient.id,
      patientPhone: patient.phone,
      content: params.message.trim(),
      intent: "broadcast",
      metadata: { source: "retention_broadcast", campaign: true },
    });

    if (result.success) {
      sent++;
      if (result.simulated) anySimulated = true;
    } else {
      failed++;
      errors.push(`${patient.full_name}: ${result.error ?? "send failed"}`);
    }
  }

  revalidatePath("/owner/retention");
  revalidatePath("/doctor/retention");
  revalidatePath("/receptionist/retention");

  return { sent, failed, errors, simulated: anySimulated };
}
