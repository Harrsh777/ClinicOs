"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import {
  buildTeleconsultMeetMessage,
  isValidGoogleMeetUrl,
  normalizeMeetUrl,
} from "@/lib/teleconsult/meet-link";
import { ensureTeleconsultSession } from "@/lib/teleconsult/sessions";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { z } from "zod";

const sendMeetLinkSchema = z.object({
  sessionId: z.string().uuid(),
  meetUrl: z.string().min(10),
});

export async function getTeleconsultSessions(clinicId?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("teleconsult_sessions")
    .select(`
      *,
      patients(full_name, phone),
      doctors(id, profiles(full_name)),
      appointments(appointment_date, appointment_time, status)
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
  await requireAuth();
  const service = await createServiceClient();
  const result = await ensureTeleconsultSession(service, appointmentId);
  if ("error" in result) return { error: result.error };

  revalidatePath("/doctor/teleconsult");
  revalidatePath("/patient/teleconsult");
  revalidatePath("/owner/teleconsult");
  return { success: true, sessionId: result.sessionId };
}

export async function sendMeetLinkAction(sessionId: string, meetUrl: string) {
  const profile = await requireRole(["doctor", "clinic_owner"]);
  const parsed = sendMeetLinkSchema.safeParse({ sessionId, meetUrl });
  if (!parsed.success) return { error: "Invalid meeting link" };

  const normalizedUrl = normalizeMeetUrl(parsed.data.meetUrl);
  if (!normalizedUrl || !isValidGoogleMeetUrl(normalizedUrl)) {
    return { error: "Please enter a valid Google Meet link (e.g. https://meet.google.com/abc-defg-hij)" };
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("teleconsult_sessions")
    .select(`
      id,
      clinic_id,
      doctor_id,
      patient_id,
      status,
      patients(full_name, phone),
      doctors(profiles(full_name)),
      appointments(appointment_date, appointment_time),
      clinics(name)
    `)
    .eq("id", sessionId)
    .single();

  if (!session) return { error: "Session not found" };
  if (profile.role === "doctor") {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (!doctor || doctor.id !== session.doctor_id) {
      return { error: "You can only send links for your own consultations" };
    }
  } else if (profile.clinic_id !== session.clinic_id) {
    return { error: "Session not found" };
  }

  if (["completed", "cancelled", "no_show"].includes(session.status)) {
    return { error: "This consultation has already ended" };
  }

  const patient = session.patients as unknown as { full_name: string; phone: string } | null;
  if (!patient?.phone) return { error: "Patient phone number is missing" };

  const doctorName =
    (session.doctors as unknown as { profiles: { full_name: string } | null } | null)?.profiles?.full_name ??
    "Doctor";
  const appointment = session.appointments as unknown as {
    appointment_date: string;
    appointment_time: string;
  } | null;
  const clinicName = (session.clinics as unknown as { name: string } | null)?.name ?? "ClinicOS Clinic";

  if (!appointment) return { error: "Appointment details not found" };

  const message = buildTeleconsultMeetMessage({
    patientName: patient.full_name,
    doctorName,
    clinicName,
    appointmentDate: appointment.appointment_date,
    appointmentTime: appointment.appointment_time,
    meetUrl: normalizedUrl,
  });

  const now = new Date().toISOString();
  const service = await createServiceClient();

  const { error: updateError } = await service
    .from("teleconsult_sessions")
    .update({
      meeting_url: normalizedUrl,
      meet_link_sent_at: now,
      daily_room_url: normalizedUrl,
    })
    .eq("id", sessionId);

  if (updateError) return { error: updateError.message };

  const whatsapp = await sendWhatsAppMessage({
    clinicId: session.clinic_id,
    patientId: session.patient_id,
    patientPhone: patient.phone,
    content: message,
    intent: "teleconsult_meet_link",
    metadata: {
      sessionId,
      meetUrl: normalizedUrl,
      sentBy: profile.id,
    },
  });

  revalidatePath("/doctor/teleconsult");
  revalidatePath(`/doctor/teleconsult/${sessionId}`);
  revalidatePath("/patient/teleconsult");
  revalidatePath(`/patient/teleconsult/${sessionId}`);
  revalidatePath("/owner/teleconsult");

  if (!whatsapp.success && !whatsapp.simulated) {
    return {
      error: whatsapp.error ?? "Meeting link saved but WhatsApp delivery failed",
      meetUrl: normalizedUrl,
    };
  }

  return {
    success: true,
    meetUrl: normalizedUrl,
    simulated: whatsapp.simulated,
  };
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
    const service = await createServiceClient();
    await ensureTeleconsultSession(service, appointment.id);
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
    .or("type.eq.teleconsult,consultation_type.eq.video")
    .in("status", ["confirmed", "pending"])
    .not("id", "in", `(SELECT appointment_id FROM teleconsult_sessions)`);

  for (const apt of appointments ?? []) {
    await ensureTeleconsultSession(service, apt.id);
  }
}
