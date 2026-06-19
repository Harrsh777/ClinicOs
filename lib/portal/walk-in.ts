import { createServiceClient } from "@/lib/supabase/server";
import { getClinicHoursStatus, getTodayDateInClinicTz, type OpeningHours } from "@/lib/portal/clinic-hours";

export interface WalkInPortalSettings {
  enabled: boolean;
  maxDailyWalkIns: number;
}

export interface WalkInValidationResult {
  ok: boolean;
  error?: string;
  existingBookingId?: string;
  hours?: ReturnType<typeof getClinicHoursStatus>;
}

export async function getWalkInPortalSettings(clinicId: string): Promise<WalkInPortalSettings> {
  const service = await createServiceClient();
  const { data } = await service
    .from("clinic_branding")
    .select("portal_walk_in_enabled, portal_max_daily_walk_ins")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  return {
    enabled: data?.portal_walk_in_enabled ?? true,
    maxDailyWalkIns: data?.portal_max_daily_walk_ins ?? 200,
  };
}

export async function getPortalQueueStats(clinicId: string) {
  const service = await createServiceClient();
  const today = getTodayDateInClinicTz();

  const [{ count: waiting }, { count: walkInsToday }, { data: session }] = await Promise.all([
    service
      .from("queue_tokens")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("status", "waiting"),
    service
      .from("clinic_visits")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("visit_type", "walk_in")
      .gte("created_at", `${today}T00:00:00`),
    service
      .from("queue_sessions")
      .select("current_token, avg_consultation_mins")
      .eq("clinic_id", clinicId)
      .eq("session_date", today)
      .maybeSingle(),
  ]);

  const avgMins = session?.avg_consultation_mins ?? 15;
  const estimatedWaitMins = (waiting ?? 0) * avgMins;

  return {
    waiting: waiting ?? 0,
    walkInsToday: walkInsToday ?? 0,
    currentToken: session?.current_token ?? 0,
    estimatedWaitMins,
  };
}

export async function validateWalkInRequest(
  clinicId: string,
  phone: string,
  openingHours: OpeningHours | null | undefined
): Promise<WalkInValidationResult> {
  const settings = await getWalkInPortalSettings(clinicId);
  if (!settings.enabled) {
    return { ok: false, error: "Online walk-in is disabled for this clinic. Please visit reception." };
  }

  const hours = getClinicHoursStatus(openingHours);
  if (!hours.isOpen) {
    return { ok: false, error: hours.message, hours };
  }

  const stats = await getPortalQueueStats(clinicId);
  if (stats.walkInsToday >= settings.maxDailyWalkIns) {
    return {
      ok: false,
      error: "Walk-in capacity reached for today. Please visit reception or book an appointment.",
      hours,
    };
  }

  const normalized = phone.replace(/\D/g, "").slice(-10);
  const service = await createServiceClient();
  const today = getTodayDateInClinicTz();

  const { data: patient } = await service
    .from("patients")
    .select("id")
    .eq("clinic_id", clinicId)
    .ilike("phone", `%${normalized}`)
    .maybeSingle();

  if (patient) {
    const { data: activeVisit } = await service
      .from("clinic_visits")
      .select("booking_id, token_label, check_in_status")
      .eq("patient_id", patient.id)
      .eq("clinic_id", clinicId)
      .gte("created_at", `${today}T00:00:00`)
      .in("check_in_status", ["scheduled", "in_queue", "checked_in"])
      .maybeSingle();

    if (activeVisit) {
      return {
        ok: false,
        error: activeVisit.token_label
          ? `You already have token ${activeVisit.token_label} today.`
          : "You already have an active visit today.",
        existingBookingId: activeVisit.booking_id,
        hours,
      };
    }
  }

  return { ok: true, hours };
}
