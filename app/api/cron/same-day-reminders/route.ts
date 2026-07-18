import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { formatTwoHourReminder } from "@/lib/engagement/growth-messages";
import { parseGrowthSettings } from "@/lib/engagement/growth-settings";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Parse "HH:MM" or "HH:MM:SS" into minutes from midnight. */
function timeToMinutes(time: string): number | null {
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(mins)) return null;
  return hours * 60 + mins;
}

/** Current clock minutes in Asia/Kolkata (IST). */
function nowMinutesInIst(): { dateStr: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { dateStr, minutes };
}

/**
 * Hourly cron — send "see you in 2 hours" for appointments ~90–150 minutes from now.
 * Clinics must have noShowRemindersEnabled.
 */
export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();
  const { dateStr: todayStr, minutes: nowMins } = nowMinutesInIst();
  const windowStart = nowMins + 90;
  const windowEnd = nowMins + 150;

  const { data: clinics } = await service.from("clinics").select("id, name, settings");
  const enabled = new Map<string, string>();
  for (const c of clinics ?? []) {
    const growth = parseGrowthSettings((c.settings ?? {}) as Record<string, unknown>);
    if (growth.noShowRemindersEnabled) {
      enabled.set(c.id as string, c.name as string);
    }
  }

  if (enabled.size === 0) {
    return NextResponse.json({ success: true, remindersSent: 0, failed: 0, skipped: "no clinics enabled" });
  }

  const { data: appointments } = await service
    .from("appointments")
    .select(`
      id, clinic_id, appointment_date, appointment_time,
      patients(id, full_name, phone)
    `)
    .eq("appointment_date", todayStr)
    .in("status", ["confirmed", "pending"])
    .in("clinic_id", [...enabled.keys()]);

  let sent = 0;
  let failed = 0;
  let skippedWindow = 0;

  for (const apt of appointments ?? []) {
    const aptMins = timeToMinutes(apt.appointment_time);
    if (aptMins == null) continue;

    // Handle window that doesn't wrap midnight for same-day appointments
    if (aptMins < windowStart || aptMins > windowEnd) {
      skippedWindow++;
      continue;
    }

    const patient = apt.patients as unknown as { id: string; full_name: string; phone: string };
    if (!patient?.phone) continue;

    const clinicName = enabled.get(apt.clinic_id) ?? "the clinic";

    const { data: existing } = await service
      .from("whatsapp_messages")
      .select("id")
      .eq("clinic_id", apt.clinic_id)
      .eq("patient_phone", patient.phone)
      .eq("intent", "reminder_2h")
      .contains("metadata", { appointment_id: apt.id })
      .maybeSingle();

    if (existing) continue;

    const message = formatTwoHourReminder({
      time: apt.appointment_time,
      clinicName,
    });

    const result = await sendWhatsAppMessage({
      clinicId: apt.clinic_id,
      patientId: patient.id,
      patientPhone: patient.phone,
      content: message,
      intent: "reminder_2h",
      metadata: { appointment_id: apt.id },
      senderType: "system",
    });

    if (result.success) sent++;
    else failed++;
  }

  return NextResponse.json({
    success: true,
    remindersSent: sent,
    failed,
    skippedWindow,
    window: { start: windowStart, end: windowEnd, today: todayStr },
  });
}
