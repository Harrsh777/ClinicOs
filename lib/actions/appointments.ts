"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { z } from "zod";

const bookSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  date: z.string(),
  time: z.string(),
  type: z.enum(["scheduled", "walk_in", "emergency", "vip", "teleconsult"]).default("scheduled"),
  notes: z.string().optional(),
});

export async function bookAppointmentAction(formData: FormData) {
  const profile = await requireAuth();

  const parsed = bookSchema.safeParse({
    patientId: formData.get("patientId"),
    doctorId: formData.get("doctorId"),
    date: formData.get("date"),
    time: formData.get("time"),
    type: formData.get("type") || "scheduled",
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: "Invalid appointment data" };

  const supabase = await createClient();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("clinic_id")
    .eq("id", parsed.data.doctorId)
    .single();

  if (!doctor) return { error: "Doctor not found" };

  const priority =
    parsed.data.type === "emergency"
      ? "emergency"
      : parsed.data.type === "vip"
        ? "vip"
        : "normal";

  const status = profile.role === "patient" ? "pending" : "confirmed";

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      clinic_id: doctor.clinic_id,
      patient_id: parsed.data.patientId,
      doctor_id: parsed.data.doctorId,
      appointment_date: parsed.data.date,
      appointment_time: parsed.data.time,
      status,
      type: parsed.data.type,
      priority,
      notes: parsed.data.notes,
      booked_by: profile.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (parsed.data.type === "walk_in" || parsed.data.type === "emergency") {
    await generateQueueToken(doctor.clinic_id, parsed.data.patientId, data.id, parsed.data.doctorId, priority);
  }

  if (status === "confirmed" || profile.role !== "patient") {
    const { createVisitForAppointmentAction } = await import("@/lib/actions/visits");
    await createVisitForAppointmentAction(data.id).catch(() => null);
  }

  revalidatePath("/appointments");
  return { success: true, appointmentId: data.id };
}

export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: "confirmed" | "rejected" | "cancelled" | "completed" | "no_show",
  reason?: string
) {
  const profile = await requireRole(["clinic_owner", "receptionist", "doctor"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("appointments")
    .select("id, clinic_id, doctor_id, status")
    .eq("id", appointmentId)
    .single();

  if (!existing) return { error: "Appointment not found" };
  if (existing.clinic_id !== profile.clinic_id) return { error: "Forbidden" };

  if (profile.role === "doctor") {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (!doctor || existing.doctor_id !== doctor.id) return { error: "Forbidden" };
  }

  const update: Record<string, unknown> = { status };
  if (reason) update.rejection_reason = reason;

  const { data, error } = await supabase
    .from("appointments")
    .update(update)
    .eq("id", appointmentId)
    .select("*, patients(user_id)")
    .single();

  if (error) return { error: error.message };

  if (status === "confirmed" && data) {
    const { createVisitForAppointmentAction } = await import("@/lib/actions/visits");
    await createVisitForAppointmentAction(appointmentId).catch(() => null);

    const patient = data.patients as { user_id: string | null } | null;
    if (patient?.user_id) {
      await supabase.from("notifications").insert({
        user_id: patient.user_id,
        clinic_id: data.clinic_id,
        title: "Appointment Confirmed",
        body: `Your appointment on ${data.appointment_date} at ${data.appointment_time} has been confirmed.`,
        type: "appointment",
      });
    }
  }

  if (status === "rejected" && data) {
    const patient = data.patients as { user_id: string | null } | null;
    if (patient?.user_id) {
      await supabase.from("notifications").insert({
        user_id: patient.user_id,
        clinic_id: data.clinic_id,
        title: "Appointment Declined",
        body: reason
          ? `Your appointment request was declined: ${reason}`
          : "Your appointment request was declined.",
        type: "appointment",
      });
    }
  }

  revalidatePath("/owner/appointments");
  revalidatePath("/receptionist/appointments");
  revalidatePath("/doctor/appointments");
  return { success: true };
}

async function getOrCreateSessionForClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicId: string
) {
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("queue_sessions")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("session_date", today)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("queue_sessions")
    .insert({ clinic_id: clinicId, session_date: today })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function getOrCreateSession(clinicId: string) {
  const supabase = await createClient();
  return getOrCreateSessionForClient(supabase, clinicId);
}

type TokenSeries = "regular" | "emergency" | "vip";
type PaymentStatus = "not_required" | "pending" | "paid";

function buildTokenLabel(series: TokenSeries, seriesNumber: number): string {
  const prefix = series === "emergency" ? "E" : series === "vip" ? "V" : "A";
  const pad = series === "emergency" ? 2 : 0;
  return `${prefix}-${String(seriesNumber).padStart(pad || 1, "0")}`;
}

export async function generateQueueTokenWithSeries(
  clinicId: string,
  patientId: string,
  series: TokenSeries = "regular",
  options: {
    appointmentId?: string;
    doctorId?: string;
    priority?: "normal" | "vip" | "emergency";
    paymentStatus?: PaymentStatus;
    visitId?: string;
  } = {}
) {
  const supabase = await createClient();
  return generateQueueTokenWithSeriesForClient(supabase, clinicId, patientId, series, options);
}

export async function generateQueueTokenWithSeriesForClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicId: string,
  patientId: string,
  series: TokenSeries = "regular",
  options: {
    appointmentId?: string;
    doctorId?: string;
    priority?: "normal" | "vip" | "emergency";
    paymentStatus?: PaymentStatus;
    visitId?: string;
  } = {}
) {
  const session = await getOrCreateSessionForClient(supabase, clinicId);

  const priority =
    options.priority ??
    (series === "emergency" ? "emergency" : series === "vip" ? "vip" : "normal");

  const { count } = await supabase
    .from("queue_tokens")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.id)
    .eq("token_series", series);

  const seriesNumber = (count ?? 0) + 1;

  const { data: maxToken } = await supabase
    .from("queue_tokens")
    .select("token_number")
    .eq("session_id", session.id)
    .order("token_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = (maxToken?.token_number ?? 0) + 1;
  const tokenLabel = buildTokenLabel(series, seriesNumber);

  const insertData: Record<string, unknown> = {
    session_id: session.id,
    clinic_id: clinicId,
    token_number: nextNumber,
    patient_id: patientId,
    appointment_id: options.appointmentId ?? null,
    doctor_id: options.doctorId ?? null,
    priority,
    status: "waiting",
    token_series: series,
    series_number: seriesNumber,
    token_label: tokenLabel,
    payment_status: options.paymentStatus ?? "not_required",
    visit_id: options.visitId ?? null,
  };

  const { data, error } = await supabase.from("queue_tokens").insert(insertData).select().single();

  if (error) {
    // Fallback if migration 006 not applied yet
    const { data: fallback, error: fbErr } = await supabase
      .from("queue_tokens")
      .insert({
        session_id: session.id,
        clinic_id: clinicId,
        token_number: nextNumber,
        patient_id: patientId,
        appointment_id: options.appointmentId ?? null,
        doctor_id: options.doctorId ?? null,
        priority,
        status: "waiting",
      })
      .select()
      .single();
    if (fbErr) return { error: fbErr.message };
    return { success: true, token: { ...fallback, token_label: `#${nextNumber}` } };
  }

  revalidatePath("/receptionist/queue");
  return { success: true, token: data };
}

export async function generateQueueToken(
  clinicId: string,
  patientId: string,
  appointmentId?: string,
  doctorId?: string,
  priority: "normal" | "vip" | "emergency" = "normal"
) {
  const series: TokenSeries =
    priority === "emergency" ? "emergency" : priority === "vip" ? "vip" : "regular";
  return generateQueueTokenWithSeries(clinicId, patientId, series, {
    appointmentId,
    doctorId,
    priority,
  });
}

export async function getDoctors(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("doctors")
    .select("*, profiles(full_name, avatar_url, specialization)")
    .eq("clinic_id", clinicId)
    .eq("is_accepting_appointments", true);
  return data ?? [];
}

export async function getAppointments(
  clinicId: string,
  filters?: { status?: string; date?: string; dateFrom?: string; dateTo?: string; doctorId?: string }
) {
  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select("*, patients(full_name, phone), doctors(*, profiles(full_name))")
    .eq("clinic_id", clinicId)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.date) query = query.eq("appointment_date", filters.date);
  if (filters?.dateFrom) query = query.gte("appointment_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("appointment_date", filters.dateTo);
  if (filters?.doctorId) query = query.eq("doctor_id", filters.doctorId);

  const { data } = await query;
  return data ?? [];
}

const scheduleSchema = z.object({
  doctorId: z.string().uuid(),
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
      isAvailable: z.boolean(),
    })
  ),
});

export async function saveDoctorScheduleAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const doctorId = formData.get("doctorId") as string;
  const schedulesJson = formData.get("schedules") as string;
  const schedules = JSON.parse(schedulesJson);

  const parsed = scheduleSchema.safeParse({ doctorId, schedules });
  if (!parsed.success) return { error: "Invalid schedule data" };

  const supabase = await createClient();
  await supabase.from("doctor_schedules").delete().eq("doctor_id", doctorId);

  const rows = parsed.data.schedules
    .filter((s) => s.isAvailable)
    .map((s) => ({
      doctor_id: doctorId,
      clinic_id: profile.clinic_id!,
      day_of_week: s.dayOfWeek,
      start_time: s.startTime,
      end_time: s.endTime,
      is_available: true,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("doctor_schedules").insert(rows);
    if (error) return { error: error.message };
  }

  revalidatePath("/owner/settings");
  return { success: true };
}

export async function getAvailableSlots(doctorId: string, date: string) {
  const supabase = await createClient();
  const dayOfWeek = new Date(date).getDay();

  const [{ data: schedule }, { data: blocked }, { data: booked }, { data: doctor }] =
    await Promise.all([
      supabase.from("doctor_schedules").select("*").eq("doctor_id", doctorId).eq("day_of_week", dayOfWeek).maybeSingle(),
      supabase.from("doctor_blocked_dates").select("*").eq("doctor_id", doctorId).eq("blocked_date", date).maybeSingle(),
      supabase.from("appointments").select("appointment_time").eq("doctor_id", doctorId).eq("appointment_date", date).neq("status", "cancelled"),
      supabase.from("doctors").select("slot_duration_mins").eq("id", doctorId).single(),
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
