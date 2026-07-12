import type { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

export async function generatePatientCode(service: ServiceClient, clinicId: string): Promise<string> {
  const { data, error } = await service.rpc("generate_patient_code", { p_clinic_id: clinicId });
  if (error || !data) throw new Error(error?.message ?? "Failed to generate patient code");
  return data as string;
}

export async function generateBookingId(service: ServiceClient): Promise<string> {
  const { data, error } = await service.rpc("generate_booking_id_atomic");
  if (error || !data) throw new Error(error?.message ?? "Failed to generate booking ID");
  return data as string;
}

export interface SlotReservation {
  appointmentId: string;
  appointmentNumber: string;
  paymentExpiresAt: string | null;
}

export async function reserveAppointmentSlot(
  service: ServiceClient,
  params: {
    clinicId: string;
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    consultationType: "normal" | "emergency" | "video";
    paymentMode: "online" | "at_clinic";
    priority: "normal" | "emergency";
    aptType: "scheduled" | "emergency";
    holdMinutes?: number;
  }
): Promise<{ ok: true; reservation: SlotReservation } | { ok: false; error: string }> {
  const { data, error } = await service.rpc("reserve_appointment_slot", {
    p_clinic_id: params.clinicId,
    p_patient_id: params.patientId,
    p_doctor_id: params.doctorId,
    p_date: params.date,
    p_time: params.time,
    p_consultation_type: params.consultationType,
    p_payment_mode: params.paymentMode,
    p_priority: params.priority,
    p_apt_type: params.aptType,
    p_hold_minutes: params.holdMinutes ?? 15,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as {
    ok: boolean;
    error?: string;
    appointment_id?: string;
    appointment_number?: string;
    payment_expires_at?: string | null;
  };

  if (!result?.ok) {
    const code = result?.error ?? "unknown";
    if (code === "slot_taken") {
      return { ok: false, error: "This slot is no longer available. Please choose another time." };
    }
    if (code === "doctor_unavailable") {
      return { ok: false, error: "This doctor is not accepting appointments right now." };
    }
    if (code === "clinic_unavailable") {
      return { ok: false, error: "Online booking is not available for this clinic." };
    }
    return { ok: false, error: "Unable to reserve this slot." };
  }

  return {
    ok: true,
    reservation: {
      appointmentId: result.appointment_id!,
      appointmentNumber: result.appointment_number!,
      paymentExpiresAt: result.payment_expires_at ?? null,
    },
  };
}
