import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/actions/appointments";
import { createServiceClient } from "@/lib/supabase/server";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";

async function getPublicAvailableSlots(doctorId: string, date: string) {
  const service = await createServiceClient();
  const dayOfWeek = new Date(date).getDay();

  const [{ data: schedule }, { data: blocked }, { data: booked }, { data: doctor }] =
    await Promise.all([
      service.from("doctor_schedules").select("*").eq("doctor_id", doctorId).eq("day_of_week", dayOfWeek).maybeSingle(),
      service.from("doctor_blocked_dates").select("*").eq("doctor_id", doctorId).eq("blocked_date", date).maybeSingle(),
      service.from("appointments").select("appointment_time").eq("doctor_id", doctorId).eq("appointment_date", date).neq("status", "cancelled"),
      service.from("doctors").select("slot_duration_mins").eq("id", doctorId).single(),
    ]);

  if (!schedule || blocked) return [];

  const duration = doctor?.slot_duration_mins ?? 15;
  const bookedTimes = new Set((booked ?? []).map((b) => b.appointment_time.slice(0, 5)));
  const slots: string[] = [];

  const [startH, startM] = schedule.start_time.split(":").map(Number);
  const [endH, endM] = schedule.end_time.split(":").map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current + duration <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    if (!bookedTimes.has(time)) slots.push(time);
    current += duration;
  }

  return slots;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const clinicSlug = searchParams.get("clinicSlug");
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date");

  if (!clinicSlug || !doctorId || !date) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  const slots = await getPublicAvailableSlots(doctorId, date);
  return NextResponse.json({ slots });
}
