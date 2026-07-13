import { createServiceClient } from "@/lib/supabase/server";
import { normalizeIndianPhone } from "@/lib/validations/phone";
import { ensureTeleconsultSession } from "@/lib/teleconsult/sessions";
import type { AppointmentIntent } from "@/lib/ai/appointment-bot";
import { formatBookingReply, formatBookingPrompt } from "@/lib/ai/appointment-bot";

export interface BookingSession {
  id: string;
  desired_date: string | null;
  desired_time: string | null;
  reason: string | null;
  consultation_type: "normal" | "emergency" | "video";
  doctor_id: string | null;
}

export async function getActiveBookingSession(
  clinicId: string,
  phone: string
): Promise<BookingSession | null> {
  const service = await createServiceClient();
  const { data } = await service
    .from("whatsapp_booking_sessions")
    .select("id, desired_date, desired_time, reason, consultation_type, doctor_id")
    .eq("clinic_id", clinicId)
    .eq("patient_phone", normalizeIndianPhone(phone))
    .eq("state", "collecting")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function upsertBookingSession(
  clinicId: string,
  phone: string,
  patientId: string | null,
  updates: Partial<{
    date: string;
    time: string;
    reason: string;
    consultationType: "normal" | "emergency" | "video";
    doctorId: string;
  }>
): Promise<BookingSession> {
  const service = await createServiceClient();
  const normalizedPhone = normalizeIndianPhone(phone);
  const existing = await getActiveBookingSession(clinicId, phone);

  const payload = {
    clinic_id: clinicId,
    patient_phone: normalizedPhone,
    patient_id: patientId,
    desired_date: updates.date ?? existing?.desired_date ?? null,
    desired_time: updates.time ?? existing?.desired_time ?? null,
    reason: updates.reason ?? existing?.reason ?? null,
    consultation_type: updates.consultationType ?? existing?.consultation_type ?? "normal",
    doctor_id: updates.doctorId ?? existing?.doctor_id ?? null,
    state: "collecting" as const,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await service
      .from("whatsapp_booking_sessions")
      .update(payload)
      .eq("id", existing.id)
      .select("id, desired_date, desired_time, reason, consultation_type, doctor_id")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await service
    .from("whatsapp_booking_sessions")
    .insert(payload)
    .select("id, desired_date, desired_time, reason, consultation_type, doctor_id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function completeBookingSession(sessionId: string) {
  const service = await createServiceClient();
  await service
    .from("whatsapp_booking_sessions")
    .update({ state: "completed", updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function cancelBookingSession(clinicId: string, phone: string) {
  const service = await createServiceClient();
  await service
    .from("whatsapp_booking_sessions")
    .update({ state: "cancelled", updated_at: new Date().toISOString() })
    .eq("clinic_id", clinicId)
    .eq("patient_phone", normalizeIndianPhone(phone))
    .eq("state", "collecting");
}

async function resolveDoctor(
  clinicId: string,
  doctorName?: string,
  preferredDoctorId?: string | null
) {
  const service = await createServiceClient();

  if (preferredDoctorId) {
    const { data } = await service
      .from("doctors")
      .select("id, profiles(full_name)")
      .eq("id", preferredDoctorId)
      .eq("clinic_id", clinicId)
      .eq("is_accepting_appointments", true)
      .maybeSingle();
    if (data) return data;
  }

  if (doctorName) {
    const { data: doctors } = await service
      .from("doctors")
      .select("id, profiles(full_name)")
      .eq("clinic_id", clinicId)
      .eq("is_accepting_appointments", true);

    const match = (doctors ?? []).find((d) => {
      const name = (d.profiles as unknown as { full_name: string })?.full_name ?? "";
      return name.toLowerCase().includes(doctorName.toLowerCase());
    });
    if (match) return match;
  }

  const { data } = await service
    .from("doctors")
    .select("id, profiles(full_name)")
    .eq("clinic_id", clinicId)
    .eq("is_accepting_appointments", true)
    .limit(1)
    .maybeSingle();

  return data;
}

function missingFields(session: BookingSession): ("date" | "time" | "reason")[] {
  const missing: ("date" | "time" | "reason")[] = [];
  if (!session.desired_date) missing.push("date");
  if (!session.desired_time) missing.push("time");
  if (!session.reason) missing.push("reason");
  return missing;
}

export async function handleWhatsAppBooking(input: {
  clinicId: string;
  phone: string;
  message: string;
  intent: AppointmentIntent;
}): Promise<{ reply: string; booked?: boolean; appointmentId?: string }> {
  const service = await createServiceClient();
  const phone = normalizeIndianPhone(input.phone);

  const { data: patient } = await service
    .from("patients")
    .select("id, full_name")
    .eq("clinic_id", input.clinicId)
    .eq("phone", phone)
    .maybeSingle();

  if (!patient) {
    return {
      reply:
        "We couldn't find your patient record. Please register at the clinic or book online first. Once registered, reply BOOK to schedule via WhatsApp.",
    };
  }

  const isVideo =
    /video|teleconsult|online consult/i.test(input.message) ||
    input.intent.consultationType === "video";

  const session = await upsertBookingSession(input.clinicId, phone, patient.id, {
    date: input.intent.date,
    time: input.intent.time,
    reason: input.intent.reason,
    consultationType: isVideo ? "video" : "normal",
  });

  const stillMissing = missingFields(session);
  if (stillMissing.length > 0) {
    return { reply: formatBookingPrompt(stillMissing) };
  }

  const doctor = await resolveDoctor(
    input.clinicId,
    input.intent.doctorName,
    session.doctor_id
  );

  if (!doctor) {
    return {
      reply: "Sorry, no doctors are accepting appointments right now. Please try again later or call the clinic.",
    };
  }

  const aptType = session.consultation_type === "video" ? "teleconsult" : "scheduled";

  const { data: result, error } = await service.rpc("book_whatsapp_appointment", {
    p_clinic_id: input.clinicId,
    p_patient_id: patient.id,
    p_doctor_id: doctor.id,
    p_date: session.desired_date,
    p_time: session.desired_time,
    p_reason: session.reason,
    p_consultation_type: session.consultation_type,
    p_apt_type: aptType,
  });

  if (error) {
    return { reply: "Something went wrong while booking. Please try again or call the clinic." };
  }

  const booking = result as { ok: boolean; error?: string; appointment_id?: string };

  if (!booking.ok) {
    if (booking.error === "slot_taken") {
      await cancelBookingSession(input.clinicId, phone);
      return {
        reply:
          "That time slot is already taken. Please send a new date and time, e.g. \"Book on 15/07 at 11:00 AM for fever\".",
      };
    }
    if (booking.error === "doctor_unavailable") {
      return { reply: "The selected doctor is not available. Please try another time." };
    }
    return { reply: "Unable to complete booking. Please contact the clinic directly." };
  }

  await completeBookingSession(session.id);

  if (aptType === "teleconsult" && booking.appointment_id) {
    await ensureTeleconsultSession(service, booking.appointment_id);
  }

  const doctorName =
    (doctor.profiles as unknown as { full_name: string })?.full_name ?? "Doctor";

  return {
    reply: formatBookingReply(
      patient.full_name,
      session.desired_date!,
      session.desired_time!,
      doctorName,
      session.reason!,
      session.consultation_type === "video"
    ),
    booked: true,
    appointmentId: booking.appointment_id,
  };
}

export async function cancelUpcomingAppointment(
  clinicId: string,
  phone: string
): Promise<string> {
  const service = await createServiceClient();
  const normalizedPhone = normalizeIndianPhone(phone);

  await cancelBookingSession(clinicId, phone);

  const { data: patient } = await service
    .from("patients")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (!patient) {
    return "We couldn't find your patient record.";
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: apt } = await service
    .from("appointments")
    .select("id, appointment_date, appointment_time")
    .eq("patient_id", patient.id)
    .gte("appointment_date", today)
    .in("status", ["confirmed", "pending"])
    .order("appointment_date")
    .order("appointment_time")
    .limit(1)
    .maybeSingle();

  if (!apt) {
    return "You have no upcoming appointments to cancel.";
  }

  await service
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", apt.id);

  return `Your appointment on ${apt.appointment_date} at ${apt.appointment_time} has been cancelled. Reply BOOK to schedule a new one.`;
}

export async function continueBookingSession(input: {
  clinicId: string;
  phone: string;
  message: string;
}): Promise<{ reply: string; handled: boolean }> {
  const session = await getActiveBookingSession(input.clinicId, input.phone);
  if (!session) return { reply: "", handled: false };

  const { parseAppointmentMessage } = await import("@/lib/ai/appointment-bot");
  const parsed = parseAppointmentMessage(input.message);

  const result = await handleWhatsAppBooking({
    clinicId: input.clinicId,
    phone: input.phone,
    message: input.message,
    intent: {
      intent: "book",
      date: parsed.date ?? session.desired_date ?? undefined,
      time: parsed.time ?? session.desired_time ?? undefined,
      reason: parsed.reason ?? session.reason ?? input.message.trim(),
      confidence: 0.7,
    },
  });

  return { reply: result.reply, handled: true };
}
