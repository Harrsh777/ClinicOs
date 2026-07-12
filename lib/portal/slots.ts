import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentTimeInClinicTz, getTodayDateInClinicTz } from "@/lib/portal/clinic-hours";

export interface SlotGenerationOptions {
  doctorId: string;
  clinicId: string;
  date: string;
  consultationType?: "normal" | "emergency" | "video";
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Parse YYYY-MM-DD as local calendar date for day-of-week */
function dayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export async function getAvailableSlotsForDoctor(options: SlotGenerationOptions): Promise<string[]> {
  const { doctorId, clinicId, date, consultationType = "normal" } = options;
  const service = await createServiceClient();
  const dayOfWeek = dayOfWeekFromDate(date);

  const [{ data: doctor }, { data: schedule }, { data: blocked }, { data: booked }, { data: billing }] =
    await Promise.all([
      service
        .from("doctors")
        .select("slot_duration_mins, buffer_mins, max_daily_patients, emergency_slots, clinic_id, is_accepting_appointments")
        .eq("id", doctorId)
        .eq("clinic_id", clinicId)
        .maybeSingle(),
      service
        .from("doctor_schedules")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_available", true)
        .maybeSingle(),
      service
        .from("doctor_blocked_dates")
        .select("id")
        .eq("doctor_id", doctorId)
        .eq("blocked_date", date)
        .maybeSingle(),
      service
        .from("appointments")
        .select("appointment_time, consultation_type, type")
        .eq("doctor_id", doctorId)
        .eq("appointment_date", date)
        .neq("status", "cancelled")
        .neq("status", "rejected"),
      service
        .from("clinic_billing_settings")
        .select("emergency_consultation_fee, video_consultation_fee")
        .eq("clinic_id", clinicId)
        .maybeSingle(),
    ]);

  if (!doctor?.is_accepting_appointments || !schedule || blocked) return [];

  const duration = doctor.slot_duration_mins ?? 15;
  const buffer = doctor.buffer_mins ?? 5;
  const step = duration + buffer;

  const bookedEntries = booked ?? [];
  if (doctor.max_daily_patients && bookedEntries.length >= doctor.max_daily_patients) {
    if (consultationType !== "emergency") return [];
  }

  const emergencyBooked = bookedEntries.filter(
    (b) => b.consultation_type === "emergency" || b.type === "emergency"
  ).length;
  if (consultationType === "emergency" && doctor.emergency_slots) {
    if (emergencyBooked >= doctor.emergency_slots) return [];
  }

  const bookedRanges = bookedEntries.map((b) => {
    const start = parseTimeToMinutes(b.appointment_time);
    return { start, end: start + duration + buffer };
  });

  const slots: string[] = [];
  const startMin = parseTimeToMinutes(schedule.start_time);
  const endMin = parseTimeToMinutes(schedule.end_time);
  const today = getTodayDateInClinicTz();
  const nowMin =
    date === today ? parseTimeToMinutes(getCurrentTimeInClinicTz()) + buffer : 0;

  let current = startMin;
  while (current + duration <= endMin) {
    if (current >= nowMin) {
      const slotEnd = current + duration;
      const overlaps = bookedRanges.some(
        (r) => current < r.end && slotEnd + buffer > r.start
      );
      if (!overlaps) slots.push(minutesToTime(current));
    }
    current += step;
  }

  void billing;
  return slots;
}

export async function getAvailableDatesForDoctor(
  doctorId: string,
  clinicId: string,
  daysAhead = 30
): Promise<string[]> {
  const service = await createServiceClient();
  const { data: doctor } = await service
    .from("doctors")
    .select("id")
    .eq("id", doctorId)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (!doctor) return [];

  const dates: string[] = [];
  const today = getTodayDateInClinicTz();
  const [ty, tm, td] = today.split("-").map(Number);
  const base = new Date(ty, tm - 1, td);

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const slots = await getAvailableSlotsForDoctor({ doctorId, clinicId, date: dateStr });
    if (slots.length > 0) dates.push(dateStr);
  }

  return dates;
}

export async function isSlotAvailable(
  doctorId: string,
  clinicId: string,
  date: string,
  time: string,
  consultationType?: "normal" | "emergency" | "video"
): Promise<boolean> {
  const slots = await getAvailableSlotsForDoctor({
    doctorId,
    clinicId,
    date,
    consultationType,
  });
  return slots.includes(time.slice(0, 5));
}
