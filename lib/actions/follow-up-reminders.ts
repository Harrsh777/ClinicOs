"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { generateEngagementMessage } from "@/lib/ai/engagement-message";
import { analyzeRecoveryReply } from "@/lib/ai/recovery-analysis";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { normalizeIndianPhone } from "@/lib/validations/phone";
import { isBookingIntent, parseMenuChoice } from "@/lib/whatsapp/concierge/menu";
import { computeSendOnDate } from "@/lib/engagement/schedule";
import type {
  EngagementReminderType,
  EngagementScheduleRule,
  RecoveryAnalysis,
} from "@/lib/engagement/types";

export interface FollowUpReminderRow {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  follow_up_date: string;
  send_on_date: string | null;
  diagnosis: string | null;
  complaint: string | null;
  reminder_type: string;
  status: string;
  patient_response: string | null;
  recovery_analysis: RecoveryAnalysis | null;
  created_at: string;
  whatsapp_message_id: string | null;
  whatsapp_messages?: {
    delivery_status: string;
    sent_at: string | null;
    delivered_at: string | null;
    read_at: string | null;
    failed_reason: string | null;
  } | null;
}

export interface ScheduleReminderParams {
  clinicId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  emrRecordId?: string | null;
  consultationId?: string | null;
  targetDate: string;
  diagnosis?: string | null;
  complaint?: string | null;
  doctorName?: string | null;
  advice?: string | null;
  reminderType?: EngagementReminderType;
  scheduleRule?: EngagementScheduleRule;
  customSendOnDate?: string;
  context?: Record<string, unknown>;
}

export async function scheduleEngagementReminder(params: ScheduleReminderParams) {
  const service = await createClient();
  const phone = normalizeIndianPhone(params.patientPhone);
  const reminderType = params.reminderType ?? "clinical_follow_up";
  const scheduleRule = params.scheduleRule ?? "tomorrow";
  const sendOnDate = computeSendOnDate(
    params.targetDate,
    scheduleRule,
    params.customSendOnDate
  );

  await service
    .from("follow_up_reminders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("patient_id", params.patientId)
    .eq("clinic_id", params.clinicId)
    .eq("reminder_type", reminderType)
    .in("status", ["scheduled", "sent", "delivered", "read"]);

  const insert: Record<string, unknown> = {
    clinic_id: params.clinicId,
    patient_id: params.patientId,
    follow_up_date: params.targetDate,
    send_on_date: sendOnDate,
    diagnosis: params.diagnosis ?? null,
    complaint: params.complaint ?? null,
    doctor_name: params.doctorName ?? null,
    advice: params.advice ?? null,
    patient_name: params.patientName,
    patient_phone: phone,
    reminder_type: reminderType,
    schedule_rule: scheduleRule,
    status: "scheduled",
    context: params.context ?? {},
  };

  if (params.emrRecordId) insert.emr_record_id = params.emrRecordId;
  if (params.consultationId) insert.consultation_id = params.consultationId;

  const { error } = await service.from("follow_up_reminders").insert(insert);

  if (error) return { error: error.message };
  return { success: true, sendOnDate };
}

/** @deprecated Use scheduleEngagementReminder */
export async function scheduleFollowUpReminder(params: {
  clinicId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  emrRecordId: string;
  consultationId: string;
  followUpDate: string;
  diagnosis: string | null;
  complaint?: string | null;
  doctorName?: string | null;
  advice?: string | null;
  scheduleRule?: EngagementScheduleRule;
}) {
  return scheduleEngagementReminder({
    clinicId: params.clinicId,
    patientId: params.patientId,
    patientName: params.patientName,
    patientPhone: params.patientPhone,
    emrRecordId: params.emrRecordId,
    consultationId: params.consultationId,
    targetDate: params.followUpDate,
    diagnosis: params.diagnosis,
    complaint: params.complaint,
    doctorName: params.doctorName,
    advice: params.advice,
    reminderType: "clinical_follow_up",
    scheduleRule: params.scheduleRule ?? "tomorrow",
  });
}

export async function completeFollowUpRemindersForVisit(
  patientId: string,
  clinicId: string
) {
  const service = await createClient();
  await service
    .from("follow_up_reminders")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId)
    .eq("reminder_type", "clinical_follow_up")
    .in("status", ["scheduled", "sent", "delivered", "read"]);
}

async function sendReminderRow(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  reminder: Record<string, unknown>
) {
  const clinicInfo = reminder.clinics as { name: string } | null;
  const clinicName = clinicInfo?.name ?? "the clinic";

  const generated = await generateEngagementMessage(reminder.clinic_id as string, {
    patientName: reminder.patient_name as string,
    complaint: reminder.complaint as string | null,
    diagnosis: reminder.diagnosis as string | null,
    doctorName: reminder.doctor_name as string | null,
    followUpDate: reminder.follow_up_date as string,
    advice: reminder.advice as string | null,
    clinicName,
    reminderType: (reminder.reminder_type as EngagementReminderType) ?? "clinical_follow_up",
  });

  const result = await sendWhatsAppMessage({
    clinicId: reminder.clinic_id as string,
    patientId: reminder.patient_id as string,
    patientPhone: reminder.patient_phone as string,
    content: generated.message,
    intent: "engagement_reminder",
    metadata: {
      followUpReminderId: reminder.id,
      reminderType: reminder.reminder_type,
    },
  });

  const status = result.success ? "sent" : "failed";

  await service
    .from("follow_up_reminders")
    .update({
      status,
      ai_message: generated.message,
      interactive_options: generated.options,
      whatsapp_message_id: result.messageId ?? null,
    })
    .eq("id", reminder.id);

  return result.success;
}

export async function processDueFollowUpReminders(clinicId?: string) {
  const service = await createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  let query = service
    .from("follow_up_reminders")
    .select(`*, clinics(name)`)
    .eq("status", "scheduled")
    .eq("send_on_date", today);

  if (clinicId) query = query.eq("clinic_id", clinicId);

  const { data: reminders } = await query;

  // Legacy rows without send_on_date: follow_up_date = tomorrow
  let legacyQuery = service
    .from("follow_up_reminders")
    .select(`*, clinics(name)`)
    .eq("status", "scheduled")
    .is("send_on_date", null)
    .eq(
      "follow_up_date",
      new Date(Date.now() + 86400000).toISOString().split("T")[0]
    );

  if (clinicId) legacyQuery = legacyQuery.eq("clinic_id", clinicId);
  const { data: legacyReminders } = await legacyQuery;

  const allReminders = [...(reminders ?? []), ...(legacyReminders ?? [])];

  let sent = 0;
  let failed = 0;

  for (const reminder of allReminders) {
    const ok = await sendReminderRow(service, reminder);
    if (ok) sent++;
    else failed++;
  }

  return { sent, failed, total: allReminders.length };
}

export async function handleEngagementReply(params: {
  clinicId: string;
  patientPhone: string;
  message: string;
}): Promise<{ handled: boolean; reply?: string }> {
  const service = await createServiceClient();
  const phone = normalizeIndianPhone(params.patientPhone);

  const { data: reminder } = await service
    .from("follow_up_reminders")
    .select("*")
    .eq("clinic_id", params.clinicId)
    .eq("patient_phone", phone)
    .in("status", ["sent", "delivered", "read"])
    .is("patient_response", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!reminder) return { handled: false };

  if (isBookingIntent(params.message) || parseMenuChoice(params.message)) {
    return { handled: false };
  }

  const options = (reminder.interactive_options ?? []) as {
    id: number;
    label: string;
    emoji?: string;
  }[];

  const analysis = await analyzeRecoveryReply({
    clinicId: params.clinicId,
    patientReply: params.message,
    options,
    diagnosis: reminder.diagnosis,
    complaint: reminder.complaint,
  });

  await service
    .from("follow_up_reminders")
    .update({
      patient_response: params.message,
      recovery_analysis: analysis,
      responded_at: new Date().toISOString(),
      status: analysis.doctor_attention_required ? "read" : reminder.status,
    })
    .eq("id", reminder.id);

  const reply = analysis.doctor_attention_required
    ? "Thank you for letting us know. We've flagged this for your doctor — someone from the clinic will reach out if needed."
    : "Thank you for the update! Glad to hear from you. Take care and follow your doctor's advice.";

  return { handled: true, reply };
}

export async function getClinicFollowUpReminders(
  clinicId: string,
  options: { days?: number } = {}
): Promise<FollowUpReminderRow[]> {
  const days = options.days ?? 7;
  const supabase = await createClient();
  const from = new Date();
  from.setDate(from.getDate() - 1);
  const to = new Date();
  to.setDate(to.getDate() + days);

  const { data } = await supabase
    .from("follow_up_reminders")
    .select(`
      id,
      patient_id,
      patient_name,
      patient_phone,
      follow_up_date,
      send_on_date,
      diagnosis,
      complaint,
      reminder_type,
      status,
      patient_response,
      recovery_analysis,
      created_at,
      whatsapp_message_id,
      whatsapp_messages(delivery_status, sent_at, delivered_at, read_at, failed_reason)
    `)
    .eq("clinic_id", clinicId)
    .gte("follow_up_date", from.toISOString().split("T")[0])
    .lte("follow_up_date", to.toISOString().split("T")[0])
    .order("follow_up_date", { ascending: true });

  return (data ?? []).map((row) => {
    const wa = row.whatsapp_messages;
    const whatsapp = Array.isArray(wa) ? wa[0] ?? null : wa;
    return {
      ...row,
      recovery_analysis: row.recovery_analysis as RecoveryAnalysis | null,
      whatsapp_messages: whatsapp,
    } as FollowUpReminderRow;
  });
}

export async function getFollowUpRemindersAction() {
  const profile = await requireRole(["receptionist", "clinic_owner"]);
  if (!profile.clinic_id) return [];
  return getClinicFollowUpReminders(profile.clinic_id);
}

export async function markFollowUpCompletedAction(reminderId: string) {
  await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_up_reminders")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", reminderId);

  if (error) return { error: error.message };

  revalidatePath("/receptionist/queue");
  revalidatePath("/owner/queue");
  revalidatePath("/owner/retention");
  revalidatePath("/doctor/retention");
  revalidatePath("/receptionist/retention");
  return { success: true };
}
