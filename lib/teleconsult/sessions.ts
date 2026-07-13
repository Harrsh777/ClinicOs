import type { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

function isVideoAppointment(appointment: {
  type: string;
  consultation_type?: string | null;
}): boolean {
  return appointment.type === "teleconsult" || appointment.consultation_type === "video";
}

export async function ensureTeleconsultSession(
  service: ServiceClient,
  appointmentId: string
): Promise<{ sessionId: string; created: boolean } | { error: string }> {
  const { data: existing } = await service
    .from("teleconsult_sessions")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (existing?.id) {
    return { sessionId: existing.id, created: false };
  }

  const { data: appointment } = await service
    .from("appointments")
    .select("id, clinic_id, doctor_id, patient_id, type, consultation_type, status")
    .eq("id", appointmentId)
    .single();

  if (!appointment) return { error: "Appointment not found" };
  if (!isVideoAppointment(appointment)) {
    return { error: "Appointment is not a video consultation" };
  }
  if (appointment.status === "cancelled" || appointment.status === "rejected") {
    return { error: "Appointment is not active" };
  }

  const roomId = `clinicos-${appointmentId.slice(0, 8)}-${Date.now().toString(36)}`;

  const { data: session, error } = await service
    .from("teleconsult_sessions")
    .insert({
      clinic_id: appointment.clinic_id,
      appointment_id: appointmentId,
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      room_id: roomId,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retry } = await service
        .from("teleconsult_sessions")
        .select("id")
        .eq("appointment_id", appointmentId)
        .maybeSingle();
      if (retry?.id) return { sessionId: retry.id, created: false };
    }
    return { error: error.message };
  }

  return { sessionId: session.id, created: true };
}
