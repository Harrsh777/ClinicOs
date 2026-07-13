"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { scheduleEngagementReminder } from "@/lib/actions/follow-up-reminders";
import type { EngagementReminderType, EngagementScheduleRule } from "@/lib/engagement/types";
import { computeSendOnDate, todayStr } from "@/lib/engagement/schedule";

export async function scheduleSmartReminder(params: {
  clinicId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  reminderType: EngagementReminderType;
  targetDate: string;
  scheduleRule?: EngagementScheduleRule;
  diagnosis?: string | null;
  complaint?: string | null;
  doctorName?: string | null;
  advice?: string | null;
  context?: Record<string, unknown>;
}) {
  return scheduleEngagementReminder({
    clinicId: params.clinicId,
    patientId: params.patientId,
    patientName: params.patientName,
    patientPhone: params.patientPhone,
    targetDate: params.targetDate,
    reminderType: params.reminderType,
    scheduleRule: params.scheduleRule ?? defaultRuleForType(params.reminderType),
    diagnosis: params.diagnosis,
    complaint: params.complaint,
    doctorName: params.doctorName,
    advice: params.advice,
    context: params.context,
  });
}

function defaultRuleForType(type: EngagementReminderType): EngagementScheduleRule {
  switch (type) {
    case "medicine":
      return "3_days";
    case "annual_checkup":
    case "vaccination":
      return "15_days";
    case "birthday":
      return "custom";
    case "inactive_patient":
      return "7_days";
    default:
      return "tomorrow";
  }
}

/** Cron: schedule birthday wishes for patients with DOB tomorrow */
export async function processBirthdayReminders() {
  const service = await createServiceClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthDay = tomorrow.toISOString().slice(5, 10);

  const { data: patients } = await service
    .from("patients")
    .select("id, clinic_id, full_name, phone, date_of_birth")
    .not("date_of_birth", "is", null)
    .eq("is_active", true);

  let scheduled = 0;

  for (const p of patients ?? []) {
    if (!p.date_of_birth) continue;
    const dobMd = p.date_of_birth.slice(5, 10);
    if (dobMd !== monthDay) continue;

    const birthdayThisYear = `${tomorrow.getFullYear()}-${monthDay}`;
    await scheduleEngagementReminder({
      clinicId: p.clinic_id,
      patientId: p.id,
      patientName: p.full_name,
      patientPhone: p.phone,
      targetDate: birthdayThisYear,
      reminderType: "birthday",
      scheduleRule: "custom",
      customSendOnDate: todayStr(),
    });
    scheduled++;
  }

  return { scheduled };
}

/** Cron: re-engage patients with no visit in 90+ days */
export async function processInactivePatientReminders(inactiveDays = 90) {
  const service = await createServiceClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactiveDays);
  const cutoffStr = cutoff.toISOString();

  const { data: patients } = await service
    .from("patients")
    .select("id, clinic_id, full_name, phone, last_visit_at")
    .eq("is_active", true)
    .or(`last_visit_at.is.null,last_visit_at.lt.${cutoffStr}`);

  let scheduled = 0;
  const targetDate = computeSendOnDate(todayStr(), "7_days");

  for (const p of patients ?? []) {
    const { count } = await service
      .from("follow_up_reminders")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", p.id)
      .eq("reminder_type", "inactive_patient")
      .gte("created_at", cutoffStr);

    if ((count ?? 0) > 0) continue;

    await scheduleEngagementReminder({
      clinicId: p.clinic_id,
      patientId: p.id,
      patientName: p.full_name,
      patientPhone: p.phone,
      targetDate: todayStr(),
      reminderType: "inactive_patient",
      scheduleRule: "custom",
      customSendOnDate: targetDate,
      context: { inactiveDays },
    });
    scheduled++;
  }

  return { scheduled };
}

/** Schedule medicine adherence check after prescription */
export async function scheduleMedicineReminder(params: {
  clinicId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  prescriptionId: string;
  medicineNames: string[];
  daysAfter?: number;
}) {
  const days = params.daysAfter ?? 3;
  const target = new Date();
  target.setDate(target.getDate() + days);

  return scheduleEngagementReminder({
    clinicId: params.clinicId,
    patientId: params.patientId,
    patientName: params.patientName,
    patientPhone: params.patientPhone,
    targetDate: target.toISOString().split("T")[0],
    reminderType: "medicine",
    scheduleRule: "custom",
    customSendOnDate: todayStr(),
    advice: `Medicines: ${params.medicineNames.join(", ")}`,
    context: { prescriptionId: params.prescriptionId, medicines: params.medicineNames },
  });
}
