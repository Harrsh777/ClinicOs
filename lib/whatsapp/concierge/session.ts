import { createServiceClient } from "@/lib/supabase/server";
import { normalizeIndianPhone } from "@/lib/validations/phone";
import type { ConciergeFlow, ConciergeSession, ConciergeStep, PatientContext } from "./types";

const SESSION_SELECT =
  "id, clinic_id, patient_phone, patient_id, patient_name, state, step, flow, department_id, department_name, doctor_id, desired_date, desired_time, reason, consultation_type, reschedule_appointment_id, source";

export async function getConciergeSession(
  clinicId: string,
  phone: string
): Promise<ConciergeSession | null> {
  const service = await createServiceClient();
  const { data } = await service
    .from("whatsapp_booking_sessions")
    .select(SESSION_SELECT)
    .eq("clinic_id", clinicId)
    .eq("patient_phone", normalizeIndianPhone(phone))
    .eq("state", "collecting")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as ConciergeSession | null;
}

export async function upsertConciergeSession(
  clinicId: string,
  phone: string,
  updates: Partial<{
    patientId: string | null;
    patientName: string | null;
    step: ConciergeStep | string | null;
    flow: ConciergeFlow | string | null;
    departmentId: string | null;
    departmentName: string | null;
    doctorId: string | null;
    date: string | null;
    time: string | null;
    reason: string | null;
    consultationType: "normal" | "emergency" | "video";
    rescheduleAppointmentId: string | null;
    source: string;
  }>
): Promise<ConciergeSession> {
  const service = await createServiceClient();
  const normalizedPhone = normalizeIndianPhone(phone);
  const existing = await getConciergeSession(clinicId, phone);

  const payload = {
    clinic_id: clinicId,
    patient_phone: normalizedPhone,
    patient_id: updates.patientId !== undefined ? updates.patientId : existing?.patient_id ?? null,
    patient_name:
      updates.patientName !== undefined ? updates.patientName : existing?.patient_name ?? null,
    step: updates.step !== undefined ? updates.step : existing?.step ?? "menu",
    flow: updates.flow !== undefined ? updates.flow : existing?.flow ?? null,
    department_id:
      updates.departmentId !== undefined ? updates.departmentId : existing?.department_id ?? null,
    department_name:
      updates.departmentName !== undefined
        ? updates.departmentName
        : existing?.department_name ?? null,
    doctor_id: updates.doctorId !== undefined ? updates.doctorId : existing?.doctor_id ?? null,
    desired_date: updates.date !== undefined ? updates.date : existing?.desired_date ?? null,
    desired_time: updates.time !== undefined ? updates.time : existing?.desired_time ?? null,
    reason: updates.reason !== undefined ? updates.reason : existing?.reason ?? null,
    consultation_type:
      updates.consultationType ?? existing?.consultation_type ?? "normal",
    reschedule_appointment_id:
      updates.rescheduleAppointmentId !== undefined
        ? updates.rescheduleAppointmentId
        : existing?.reschedule_appointment_id ?? null,
    source: updates.source ?? existing?.source ?? "inbound",
    state: "collecting" as const,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await service
      .from("whatsapp_booking_sessions")
      .update(payload)
      .eq("id", existing.id)
      .select(SESSION_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return data as ConciergeSession;
  }

  const { data, error } = await service
    .from("whatsapp_booking_sessions")
    .insert(payload)
    .select(SESSION_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as ConciergeSession;
}

export async function completeConciergeSession(sessionId: string) {
  const service = await createServiceClient();
  await service
    .from("whatsapp_booking_sessions")
    .update({
      state: "completed",
      step: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

export async function cancelConciergeSession(clinicId: string, phone: string) {
  const service = await createServiceClient();
  await service
    .from("whatsapp_booking_sessions")
    .update({
      state: "cancelled",
      step: null,
      updated_at: new Date().toISOString(),
    })
    .eq("clinic_id", clinicId)
    .eq("patient_phone", normalizeIndianPhone(phone))
    .eq("state", "collecting");
}

export async function lookupPatient(
  clinicId: string,
  phone: string
): Promise<PatientContext | null> {
  const service = await createServiceClient();
  const normalized = normalizeIndianPhone(phone);

  const { data } = await service
    .from("patients")
    .select("id, full_name, phone, last_visit_at, visit_count")
    .eq("clinic_id", clinicId)
    .eq("phone", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    full_name: data.full_name,
    phone: data.phone,
    last_visit_at: data.last_visit_at,
    isReturning: Boolean(data.visit_count && data.visit_count > 0) || Boolean(data.last_visit_at),
  };
}

export async function ensurePatientRecord(
  clinicId: string,
  phone: string,
  fullName: string
): Promise<PatientContext> {
  const existing = await lookupPatient(clinicId, phone);
  if (existing) {
    const service = await createServiceClient();
    await service
      .from("patients")
      .update({ full_name: fullName.trim() })
      .eq("id", existing.id);
    return { ...existing, full_name: fullName.trim() };
  }

  const { upsertPortalPatientFull } = await import("@/lib/portal/patient-upsert");
  const service = await createServiceClient();
  const result = await upsertPortalPatientFull(service, clinicId, {
    fullName: fullName.trim(),
    phone,
  });

  return {
    id: result.patientId,
    full_name: fullName.trim(),
    phone: normalizeIndianPhone(phone),
    last_visit_at: null,
    isReturning: result.isReturning,
  };
}
