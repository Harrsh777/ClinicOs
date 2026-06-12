"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { z } from "zod";

export async function getTeleconsultSessions(clinicId?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("teleconsult_sessions")
    .select(`
      *,
      patients(full_name, phone),
      doctors(id, profiles(full_name))
    `)
    .order("created_at", { ascending: false });

  if (profile.role === "patient") {
    query = query.eq(
      "patient_id",
      (await supabase.from("patients").select("id").eq("user_id", profile.id).single()).data?.id ?? ""
    );
  } else if (profile.role === "doctor") {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (doctor) query = query.eq("doctor_id", doctor.id);
  } else if (clinicId || profile.clinic_id) {
    query = query.eq("clinic_id", clinicId ?? profile.clinic_id!);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getTeleconsultSession(sessionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teleconsult_sessions")
    .select(`
      *,
      patients(full_name, phone, id),
      doctors(id, profiles(full_name)),
      appointments(appointment_date, appointment_time, status)
    `)
    .eq("id", sessionId)
    .single();
  return data;
}

export async function createTeleconsultSessionAction(appointmentId: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*, doctors(id)")
    .eq("id", appointmentId)
    .single();

  if (!appointment) return { error: "Appointment not found" };

  const roomId = `clinicos-${appointmentId.slice(0, 8)}-${Date.now().toString(36)}`;

  let dailyRoomUrl: string | null = null;
  const dailyKey = process.env.DAILY_API_KEY;
  if (dailyKey) {
    try {
      const res = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dailyKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomId,
          properties: { exp: Math.floor(Date.now() / 1000) + 3600 },
        }),
      });
      if (res.ok) {
        const room = await res.json();
        dailyRoomUrl = room.url;
      }
    } catch {
      // Fallback to built-in room
    }
  }

  const { data, error } = await supabase
    .from("teleconsult_sessions")
    .insert({
      clinic_id: appointment.clinic_id,
      appointment_id: appointmentId,
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      room_id: roomId,
      daily_room_url: dailyRoomUrl,
      status: "scheduled",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/doctor/teleconsult");
  revalidatePath("/patient/teleconsult");
  return { success: true, session: data };
}

export async function joinTeleconsultAction(sessionId: string, role: "doctor" | "patient") {
  await requireAuth();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {};
  if (role === "doctor") {
    updates.doctor_joined_at = now;
    updates.status = "waiting";
  } else {
    updates.patient_joined_at = now;
  }

  const { data: session } = await supabase
    .from("teleconsult_sessions")
    .select("doctor_joined_at, patient_joined_at, status")
    .eq("id", sessionId)
    .single();

  if (session?.doctor_joined_at && (role === "patient" || session.patient_joined_at)) {
    updates.status = "in_progress";
    updates.started_at = now;
  }

  const { error } = await supabase
    .from("teleconsult_sessions")
    .update(updates)
    .eq("id", sessionId);

  if (error) return { error: error.message };
  revalidatePath(`/doctor/teleconsult/${sessionId}`);
  revalidatePath(`/patient/teleconsult/${sessionId}`);
  return { success: true };
}

export async function endTeleconsultAction(sessionId: string) {
  await requireRole(["doctor", "clinic_owner"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("teleconsult_sessions")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) return { error: error.message };
  revalidatePath("/doctor/teleconsult");
  return { success: true };
}

const bookTeleconsultSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  date: z.string(),
  time: z.string(),
});

export async function bookTeleconsultAction(formData: FormData) {
  const profile = await requireAuth();
  const parsed = bookTeleconsultSchema.safeParse({
    patientId: formData.get("patientId"),
    doctorId: formData.get("doctorId"),
    date: formData.get("date"),
    time: formData.get("time"),
  });

  if (!parsed.success) return { error: "Invalid booking data" };

  const supabase = await createClient();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("clinic_id")
    .eq("id", parsed.data.doctorId)
    .single();

  if (!doctor) return { error: "Doctor not found" };

  const status = profile.role === "patient" ? "pending" : "confirmed";

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      clinic_id: doctor.clinic_id,
      patient_id: parsed.data.patientId,
      doctor_id: parsed.data.doctorId,
      appointment_date: parsed.data.date,
      appointment_time: parsed.data.time,
      status,
      type: "teleconsult",
      priority: "normal",
      booked_by: profile.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (status === "confirmed") {
    await createTeleconsultSessionAction(appointment.id);
  }

  revalidatePath("/patient/teleconsult");
  revalidatePath("/doctor/teleconsult");
  return { success: true, appointmentId: appointment.id };
}

export async function ensureTeleconsultSessionsForClinic(clinicId: string) {
  const service = await createServiceClient();
  const { data: appointments } = await service
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("type", "teleconsult")
    .eq("status", "confirmed")
    .not("id", "in", `(SELECT appointment_id FROM teleconsult_sessions)`);

  for (const apt of appointments ?? []) {
    await createTeleconsultSessionAction(apt.id);
  }
}
