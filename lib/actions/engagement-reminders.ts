"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { scheduleEngagementReminder } from "@/lib/actions/follow-up-reminders";
import type { EngagementReminderType, EngagementScheduleRule } from "@/lib/engagement/types";
import { todayStr } from "@/lib/engagement/schedule";

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

/** Cron: re-engage patients inactive 6 / 12 / 18 months (clinics with reactivateEnabled). */
export async function processInactivePatientReminders() {
  const service = await createServiceClient();
  const {
    parseGrowthSettings,
    REACTIVATE_HORIZONS,
    inactiveHorizonForDays,
  } = await import("@/lib/engagement/growth-settings");

  const { data: clinics } = await service.from("clinics").select("id, settings");
  const enabledClinicIds = new Set(
    (clinics ?? [])
      .filter((c) => parseGrowthSettings((c.settings ?? {}) as Record<string, unknown>).reactivateEnabled)
      .map((c) => c.id as string)
  );

  if (enabledClinicIds.size === 0) return { scheduled: 0 };

  const minHorizon = Math.min(...REACTIVATE_HORIZONS);
  const newestCutoff = new Date();
  newestCutoff.setDate(newestCutoff.getDate() - minHorizon);
  const newestCutoffStr = newestCutoff.toISOString();

  const { data: patients } = await service
    .from("patients")
    .select("id, clinic_id, full_name, phone, last_visit_at")
    .eq("is_active", true)
    .in("clinic_id", [...enabledClinicIds])
    .not("last_visit_at", "is", null)
    .lt("last_visit_at", newestCutoffStr);

  let scheduled = 0;
  const today = todayStr();
  const now = Date.now();

  for (const p of patients ?? []) {
    if (!p.phone?.trim()) continue;
    if (!p.last_visit_at) continue;

    const daysSinceVisit = Math.floor((now - new Date(p.last_visit_at).getTime()) / 86_400_000);

    const horizon = inactiveHorizonForDays(daysSinceVisit);
    if (!horizon) continue;

    const horizonCutoff = new Date();
    horizonCutoff.setDate(horizonCutoff.getDate() - horizon);
    const horizonCutoffStr = horizonCutoff.toISOString();

    const { data: existing } = await service
      .from("follow_up_reminders")
      .select("id, context")
      .eq("patient_id", p.id)
      .eq("reminder_type", "inactive_patient")
      .gte("created_at", horizonCutoffStr);

    const alreadyScheduled = (existing ?? []).some((row) => {
      const ctx = (row.context ?? {}) as Record<string, unknown>;
      return Number(ctx.inactiveDays) === horizon;
    });
    if (alreadyScheduled) continue;

    await scheduleEngagementReminder({
      clinicId: p.clinic_id,
      patientId: p.id,
      patientName: p.full_name,
      patientPhone: p.phone,
      targetDate: today,
      reminderType: "inactive_patient",
      scheduleRule: "custom",
      customSendOnDate: today,
      context: { inactiveDays: horizon },
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
