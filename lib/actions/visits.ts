"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { signVisit, verifyVisitSignature } from "@/lib/visits/qr";
import { generateQueueTokenWithSeries } from "@/lib/actions/appointments";
import type { ClinicVisitWithAppointment, PatientVisitTimeline } from "@/lib/types/clinical";

type VisitType = "scheduled" | "walk_in" | "emergency";
type PaymentStatus = "not_required" | "pending" | "paid";
type TokenSeries = "regular" | "emergency" | "vip";

async function generateCodes(service: Awaited<ReturnType<typeof createServiceClient>>) {
  const visitCode = `VIS-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const bookingId = `BK-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
  return { visitCode, bookingId, signature: signVisit(visitCode) };
}

export async function createVisitAction(
  clinicId: string,
  patientId: string,
  options: {
    appointmentId?: string;
    visitType?: VisitType;
    paymentStatus?: PaymentStatus;
    tokenSeries?: TokenSeries;
    autoQueue?: boolean;
  } = {}
) {
  await requireRole(["receptionist", "clinic_owner", "doctor"]);
  const service = await createServiceClient();
  const { visitCode, bookingId, signature } = await generateCodes(service);

  const visitType = options.visitType ?? "scheduled";
  const paymentStatus = options.paymentStatus ?? (visitType === "walk_in" ? "pending" : "not_required");
  const tokenSeries: TokenSeries =
    options.tokenSeries ?? (visitType === "emergency" ? "emergency" : visitType === "walk_in" ? "regular" : "regular");

  let tokenLabel: string | null = null;
  let queueTokenId: string | null = null;

  if (options.autoQueue !== false && (visitType === "walk_in" || visitType === "emergency")) {
    const priority = visitType === "emergency" ? "emergency" : tokenSeries === "vip" ? "vip" : "normal";
    const tokenResult = await generateQueueTokenWithSeries(
      clinicId,
      patientId,
      tokenSeries,
      {
        appointmentId: options.appointmentId,
        priority,
        paymentStatus,
      }
    );
    if (tokenResult.error) return { error: tokenResult.error };
    tokenLabel = tokenResult.token?.token_label ?? null;
    queueTokenId = tokenResult.token?.id ?? null;
  }

  const { data: visit, error } = await service
    .from("clinic_visits")
    .insert({
      visit_code: visitCode,
      booking_id: bookingId,
      clinic_id: clinicId,
      patient_id: patientId,
      appointment_id: options.appointmentId ?? null,
      queue_token_id: queueTokenId,
      visit_type: visitType,
      payment_status: paymentStatus,
      check_in_status: queueTokenId ? "in_queue" : "scheduled",
      qr_signature: signature,
      token_label: tokenLabel,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (queueTokenId && visit) {
    await service.from("queue_tokens").update({ visit_id: visit.id }).eq("id", queueTokenId);
  }

  revalidatePath("/receptionist/queue");
  revalidatePath("/patient");
  return { success: true, visit };
}

export async function createVisitForAppointmentAction(appointmentId: string) {
  const service = await createServiceClient();
  const { data: apt } = await service
    .from("appointments")
    .select("clinic_id, patient_id, type, priority")
    .eq("id", appointmentId)
    .single();

  if (!apt) return { error: "Appointment not found" };

  const { data: existing } = await service
    .from("clinic_visits")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (existing) return { success: true, visitId: existing.id };

  const visitType = apt.type === "walk_in" ? "walk_in" : apt.type === "emergency" ? "emergency" : "scheduled";
  const { visitCode, bookingId, signature } = await generateCodes(service);

  const { data: visit, error } = await service
    .from("clinic_visits")
    .insert({
      visit_code: visitCode,
      booking_id: bookingId,
      clinic_id: apt.clinic_id,
      patient_id: apt.patient_id,
      appointment_id: appointmentId,
      visit_type: visitType,
      payment_status: visitType === "walk_in" ? "pending" : "not_required",
      check_in_status: "scheduled",
      qr_signature: signature,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, visit };
}

export interface VisitLookupResult {
  visit: {
    visit_code: string;
    booking_id: string;
    token_label: string | null;
    payment_status: string;
    check_in_status: string;
    visit_type: string;
  };
  patient: {
    id: string;
    full_name: string;
    phone: string;
    patient_code: string | null;
  };
  canCheckIn: boolean;
  blockReason?: string;
}

export async function lookupVisitByCode(
  visitCode: string,
  signature: string,
  clinicId: string
): Promise<VisitLookupResult | { error: string }> {
  await requireRole(["receptionist", "clinic_owner"]);

  if (!verifyVisitSignature(visitCode, signature)) {
    return { error: "Invalid QR signature — possible tampering" };
  }

  const supabase = await createClient();
  const { data: visit } = await supabase
    .from("clinic_visits")
    .select("*, patients(id, full_name, phone, patient_code)")
    .eq("visit_code", visitCode)
    .eq("clinic_id", clinicId)
    .single();

  if (!visit) return { error: "Visit not found at this clinic" };

  const patient = visit.patients as unknown as VisitLookupResult["patient"];

  let canCheckIn = true;
  let blockReason: string | undefined;

  if (visit.check_in_status === "checked_in" || visit.check_in_status === "in_queue") {
    canCheckIn = false;
    blockReason = "Already checked in";
  } else if (visit.check_in_status === "completed" || visit.check_in_status === "cancelled") {
    canCheckIn = false;
    blockReason = "Visit is closed";
  } else if (visit.payment_status === "pending") {
    canCheckIn = false;
    blockReason = "Payment pending — collect payment before check-in";
  }

  return {
    visit: {
      visit_code: visit.visit_code,
      booking_id: visit.booking_id,
      token_label: visit.token_label,
      payment_status: visit.payment_status,
      check_in_status: visit.check_in_status,
      visit_type: visit.visit_type,
    },
    patient,
    canCheckIn,
    blockReason,
  };
}

export async function lookupVisitByPhone(phone: string, clinicId: string) {
  await requireRole(["receptionist", "clinic_owner"]);
  const supabase = await createClient();
  const digits = phone.replace(/\D/g, "").slice(-10);

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, phone, patient_code")
    .eq("clinic_id", clinicId)
    .ilike("phone", `%${digits}`)
    .maybeSingle();

  if (!patient) return { error: "No patient found with this mobile number" };

  const today = new Date().toISOString().split("T")[0];
  const { data: visit } = await supabase
    .from("clinic_visits")
    .select("*")
    .eq("patient_id", patient.id)
    .eq("clinic_id", clinicId)
    .gte("created_at", `${today}T00:00:00`)
    .not("check_in_status", "in", '("completed","cancelled")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { patient, visit };
}

export async function lookupVisitByBookingId(bookingId: string, clinicId: string) {
  await requireRole(["receptionist", "clinic_owner"]);
  const supabase = await createClient();

  const { data: visit } = await supabase
    .from("clinic_visits")
    .select("*, patients(id, full_name, phone, patient_code)")
    .eq("booking_id", bookingId.toUpperCase())
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (!visit) return { error: "No booking found with this ID" };

  const patient = visit.patients as unknown as VisitLookupResult["patient"];
  return { visit, patient };
}

export async function checkInVisitAction(visitCode: string, signature: string) {
  const profile = await requireRole(["receptionist", "clinic_owner"]);
  const clinicId = profile.clinic_id!;

  const lookup = await lookupVisitByCode(visitCode, signature, clinicId);
  if ("error" in lookup) return { error: lookup.error };
  if (!lookup.canCheckIn) return { error: lookup.blockReason ?? "Cannot check in" };

  const supabase = await createClient();
  const { data: visit } = await supabase
    .from("clinic_visits")
    .select("*")
    .eq("visit_code", visitCode)
    .single();

  if (!visit) return { error: "Visit not found" };

  let tokenLabel = visit.token_label;
  let queueTokenId = visit.queue_token_id;

  if (!queueTokenId) {
    const apt = visit.appointment_id
      ? await supabase.from("appointments").select("doctor_id, priority").eq("id", visit.appointment_id).single()
      : { data: null };

    const series: TokenSeries =
      visit.visit_type === "emergency" ? "emergency" : apt.data?.priority === "vip" ? "vip" : "regular";
    const priority =
      visit.visit_type === "emergency" ? "emergency" : apt.data?.priority === "vip" ? "vip" : "normal";

    const tokenResult = await generateQueueTokenWithSeries(
      clinicId,
      visit.patient_id,
      series,
      {
        appointmentId: visit.appointment_id ?? undefined,
        doctorId: apt.data?.doctor_id,
        priority,
        paymentStatus: visit.payment_status as PaymentStatus,
        visitId: visit.id,
      }
    );

    if (tokenResult.error) return { error: tokenResult.error };
    tokenLabel = tokenResult.token?.token_label ?? null;
    queueTokenId = tokenResult.token?.id ?? null;
  }

  await supabase
    .from("clinic_visits")
    .update({
      check_in_status: "in_queue",
      checked_in_at: new Date().toISOString(),
      checked_in_by: profile.id,
      queue_token_id: queueTokenId,
      token_label: tokenLabel,
    })
    .eq("id", visit.id);

  revalidatePath("/receptionist/queue");
  return { success: true, tokenLabel, bookingId: visit.booking_id };
}

export async function markVisitPaidAction(visitId: string) {
  await requireRole(["receptionist", "clinic_owner", "finance_manager"]);
  const supabase = await createClient();

  await supabase.from("clinic_visits").update({ payment_status: "paid" }).eq("id", visitId);
  await supabase.from("queue_tokens").update({ payment_status: "paid" }).eq("visit_id", visitId);

  revalidatePath("/receptionist/queue");
  revalidatePath("/owner/revenue");
  revalidatePath("/finance");
  revalidatePath("/owner");
  return { success: true };
}

export async function getPatientActiveVisit(patientId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("clinic_visits")
    .select("*")
    .eq("patient_id", patientId)
    .gte("created_at", `${today}T00:00:00`)
    .not("check_in_status", "in", '("completed","cancelled")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getPatientVisitTimeline(patientId: string): Promise<PatientVisitTimeline> {
  const supabase = await createClient();

  const [emrResult, visitsResult] = await Promise.all([
    supabase
      .from("emr_records")
      .select("*, consultations(appointment_id)")
      .eq("patient_id", patientId)
      .order("visit_number", { ascending: false }),
    supabase
      .from("clinic_visits")
      .select(`
        id,
        visit_code,
        booking_id,
        appointment_id,
        visit_type,
        payment_status,
        check_in_status,
        token_label,
        receipt_number,
        created_at,
        checked_in_at,
        appointments(
          appointment_date,
          appointment_time,
          status,
          appointment_number,
          notes,
          booking_symptoms,
          booking_notes,
          doctors(profiles(full_name))
        )
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
  ]);

  const emrRecords = emrResult.data ?? [];
  const clinicVisits = (visitsResult.data ?? []).map((visit) => {
    const appointments = visit.appointments;
    const appointment = Array.isArray(appointments) ? appointments[0] ?? null : appointments;
    return {
      ...visit,
      appointments: appointment,
    } as ClinicVisitWithAppointment;
  });

  const emrAppointmentIds = new Set(
    emrRecords
      .map((record) => {
        const consultation = record.consultations as { appointment_id?: string | null } | null;
        return consultation?.appointment_id ?? null;
      })
      .filter((id): id is string => Boolean(id))
  );

  const pendingVisits = clinicVisits.filter(
    (visit) => !visit.appointment_id || !emrAppointmentIds.has(visit.appointment_id)
  );

  return {
    emrRecords,
    clinicVisits: pendingVisits,
  };
}
