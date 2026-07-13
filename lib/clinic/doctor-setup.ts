import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingDoctor, OnboardingProgress } from "@/lib/types/onboarding";

const DAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

type ClinicSettings = {
  onboarding_doctors?: OnboardingDoctor[];
  onboarding_schedules?: OnboardingProgress["step4"] extends { schedules: infer S } ? S : never;
  onboarding_doctors_provisioned?: number;
};

type ScheduleEntry = NonNullable<OnboardingProgress["step4"]>["schedules"][string];

export async function applyDoctorSchedules(
  supabase: SupabaseClient,
  clinicId: string,
  doctorId: string,
  schedule?: ScheduleEntry
) {
  if (!schedule?.weekly) return;

  for (const [day, hours] of Object.entries(schedule.weekly)) {
    const dow = DAY_MAP[day];
    if (dow === undefined) continue;
    if (hours.closed) {
      await supabase
        .from("doctor_schedules")
        .delete()
        .eq("doctor_id", doctorId)
        .eq("day_of_week", dow);
    } else {
      await supabase.from("doctor_schedules").upsert(
        {
          doctor_id: doctorId,
          clinic_id: clinicId,
          day_of_week: dow,
          start_time: hours.open,
          end_time: hours.close,
          is_available: true,
        },
        { onConflict: "doctor_id,day_of_week" }
      );
    }
  }

  const holidayDates = (schedule.holidays ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const leaveDates = (schedule.leave ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  for (const blockedDate of [...holidayDates, ...leaveDates]) {
    await supabase.from("doctor_blocked_dates").upsert(
      { doctor_id: doctorId, clinic_id: clinicId, blocked_date: blockedDate, reason: "Holiday/leave" },
      { onConflict: "doctor_id,blocked_date" }
    );
  }
}

function buildDoctorPayload(
  clinicId: string,
  profileId: string,
  onboardingDoctor: OnboardingDoctor,
  consultationFee: number,
  schedule?: ScheduleEntry
) {
  return {
    clinic_id: clinicId,
    profile_id: profileId,
    specialization: onboardingDoctor.specialization || null,
    consultation_fee: consultationFee,
    slot_duration_mins: parseInt(onboardingDoctor.consultationDuration, 10) || 15,
    degree: onboardingDoctor.degree || null,
    experience_years: onboardingDoctor.experience ? parseInt(onboardingDoctor.experience, 10) : null,
    registration_number: onboardingDoctor.registrationNumber || null,
    languages: onboardingDoctor.languages
      ? onboardingDoctor.languages.split(",").map((l) => l.trim()).filter(Boolean)
      : [],
    biography: onboardingDoctor.biography || null,
    buffer_mins: schedule ? parseInt(schedule.bufferTime, 10) || 5 : 5,
    max_daily_patients: schedule ? parseInt(schedule.maxDailyPatients, 10) || null : null,
    emergency_slots: schedule ? parseInt(schedule.emergencySlots, 10) || 2 : 2,
    is_accepting_appointments: true,
  };
}

/** Apply the next saved onboarding doctor profile to a newly created doctor row. */
export async function enrichDoctorFromOnboarding(
  supabase: SupabaseClient,
  clinicId: string,
  doctorId: string,
  profileId: string
): Promise<OnboardingDoctor | null> {
  const { data: clinic } = await supabase
    .from("clinics")
    .select("settings, consultation_fee_default")
    .eq("id", clinicId)
    .single();

  const settings = (clinic?.settings ?? {}) as ClinicSettings;
  const doctors = settings.onboarding_doctors ?? [];
  const provisioned = settings.onboarding_doctors_provisioned ?? 0;
  const onboardingDoctor = doctors[provisioned];
  if (!onboardingDoctor) return null;

  const schedule = settings.onboarding_schedules?.[onboardingDoctor.id];
  const consultationFee = clinic?.consultation_fee_default ?? 500;

  await supabase
    .from("doctors")
    .update(buildDoctorPayload(clinicId, profileId, onboardingDoctor, consultationFee, schedule))
    .eq("id", doctorId);

  await supabase
    .from("profiles")
    .update({
      full_name: onboardingDoctor.name || undefined,
      specialization: onboardingDoctor.specialization || null,
      avatar_url: onboardingDoctor.profileImageUrl || null,
    })
    .eq("id", profileId);

  await applyDoctorSchedules(supabase, clinicId, doctorId, schedule);

  await supabase
    .from("clinics")
    .update({
      settings: {
        ...settings,
        onboarding_doctors_provisioned: provisioned + 1,
      },
    })
    .eq("id", clinicId);

  return onboardingDoctor;
}
