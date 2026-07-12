"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/auth/audit";
import { createNotification, notifyCancellation } from "@/lib/notifications/service";
import { createWalkInBillWithPayment, getClinicFeeSetup } from "@/lib/actions/billing";
import { resolveOrCreateClinicPatient } from "@/lib/actions/patients";
import { resolveWalkInFee } from "@/lib/billing/clinic-fees";
import { z } from "zod";

const bookSchema = z
  .object({
    patientMode: z.enum(["existing", "new"]).optional(),
    patientId: z.string().uuid().optional(),
    fullName: z.string().min(2).optional(),
    phone: z.string().min(10).optional(),
    gender: z.string().optional(),
    doctorId: z.string().uuid(),
    date: z.string(),
    time: z.string(),
    type: z.enum(["scheduled", "walk_in", "emergency", "vip", "teleconsult"]).default("scheduled"),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.patientId) return true;
      return data.patientMode === "new" && !!data.fullName && !!data.phone;
    },
    { message: "Patient is required" }
  );

export async function bookAppointmentAction(formData: FormData) {
  const profile = await requireAuth();

  const parsed = bookSchema.safeParse({
    patientMode: formData.get("patientMode") || undefined,
    patientId: formData.get("patientId") || undefined,
    fullName: formData.get("fullName") || undefined,
    phone: formData.get("phone") || undefined,
    gender: formData.get("gender") || undefined,
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

  let patientId = parsed.data.patientId;
  let patientCode: string | null = null;
  let isNewPatient = false;

  if (!patientId) {
    if (parsed.data.patientMode !== "new") {
      return { error: "Please select a patient" };
    }
    if (!parsed.data.fullName || !parsed.data.phone) {
      return { error: "Patient name and phone are required" };
    }
    try {
      const resolved = await resolveOrCreateClinicPatient(supabase, doctor.clinic_id, profile.id, {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        gender: parsed.data.gender,
      });
      patientId = resolved.patientId;
      patientCode = resolved.patientCode;
      isNewPatient = !resolved.isExisting;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Could not register patient" };
    }
  }

  if (!patientId) return { error: "Patient is required" };

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
      patient_id: patientId,
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
    await generateQueueToken(doctor.clinic_id, patientId, data.id, parsed.data.doctorId, priority);
  }

  if (status === "confirmed" || profile.role !== "patient") {
    const { createVisitForAppointmentAction } = await import("@/lib/actions/visits");
    await createVisitForAppointmentAction(data.id).catch(() => null);
  }

  revalidatePath("/appointments");
  revalidatePath("/owner/appointments");
  revalidatePath("/receptionist/appointments");
  revalidatePath("/owner/patients");
  revalidatePath("/receptionist/patients");
  return { success: true, appointmentId: data.id, patientCode, isNewPatient };
}

const walkInQuickSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  gender: z.string().optional(),
  chiefComplaint: z.string().min(2),
  doctorId: z.string().uuid(),
  type: z.enum(["walk_in", "emergency"]).default("walk_in"),
  temperatureC: z.coerce.number().optional(),
  weightKg: z.coerce.number().optional(),
  bpSystolic: z.coerce.number().optional(),
  bpDiastolic: z.coerce.number().optional(),
  pulse: z.coerce.number().optional(),
  spo2: z.coerce.number().optional(),
  feeType: z.enum(["normal", "emergency", "custom"]).default("normal"),
  customFee: z.coerce.number().optional(),
  paymentMethod: z.enum(["cash", "card", "upi"]),
});

function pickWalkInTimeSlot(slots: string[]): string {
  if (slots.length > 0) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const upcoming = slots.find((s) => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m >= nowMins;
    });
    return upcoming ?? slots[slots.length - 1];
  }
  const d = new Date();
  const rounded = Math.ceil((d.getHours() * 60 + d.getMinutes()) / 15) * 15;
  const h = Math.floor(rounded / 60) % 24;
  const m = rounded % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function walkInQuickAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner", "receptionist"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const parsed = walkInQuickSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    gender: formData.get("gender") || undefined,
    chiefComplaint: formData.get("chiefComplaint"),
    doctorId: formData.get("doctorId"),
    type: formData.get("type") || "walk_in",
    temperatureC: formData.get("temperatureC") || undefined,
    weightKg: formData.get("weightKg") || undefined,
    bpSystolic: formData.get("bpSystolic") || undefined,
    bpDiastolic: formData.get("bpDiastolic") || undefined,
    pulse: formData.get("pulse") || undefined,
    spo2: formData.get("spo2") || undefined,
    feeType: formData.get("feeType") || "normal",
    customFee: formData.get("customFee") || undefined,
    paymentMethod: formData.get("paymentMethod"),
  });

  if (!parsed.success) return { error: "Please fill required fields including payment method" };

  const supabase = await createClient();
  const clinicId = profile.clinic_id;
  const today = new Date().toISOString().split("T")[0];
  const phone = parsed.data.phone.replace(/\D/g, "");

  const { data: existingPatient } = await supabase
    .from("patients")
    .select("id, full_name, patient_code")
    .eq("clinic_id", clinicId)
    .eq("phone", phone)
    .eq("is_active", true)
    .maybeSingle();

  let patientId = existingPatient?.id;
  let patientCode = existingPatient?.patient_code ?? null;

  if (!patientId) {
    const { count } = await supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId);

    patientCode = `P${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: newPatient, error: patientError } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinicId,
        full_name: parsed.data.fullName.trim(),
        phone,
        gender: parsed.data.gender || null,
        patient_code: patientCode,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (patientError) return { error: patientError.message };
    patientId = newPatient.id;

    await logAuditEvent({
      clinicId,
      actorId: profile.id,
      action: "create",
      entityType: "patient",
      entityId: patientId,
    });
  }

  const hasVitals =
    parsed.data.temperatureC != null ||
    parsed.data.weightKg != null ||
    parsed.data.bpSystolic != null ||
    parsed.data.bpDiastolic != null ||
    parsed.data.pulse != null ||
    parsed.data.spo2 != null;

  if (hasVitals) {
    await supabase.from("patient_vitals").insert({
      patient_id: patientId,
      clinic_id: clinicId,
      recorded_by: profile.id,
      temperature_c: parsed.data.temperatureC,
      weight_kg: parsed.data.weightKg,
      bp_systolic: parsed.data.bpSystolic,
      bp_diastolic: parsed.data.bpDiastolic,
      pulse: parsed.data.pulse,
      spo2: parsed.data.spo2,
    });
  }

  const { data: doctor } = await supabase
    .from("doctors")
    .select("clinic_id")
    .eq("id", parsed.data.doctorId)
    .single();

  if (!doctor || doctor.clinic_id !== clinicId) return { error: "Doctor not found" };

  const slots = await getAvailableSlots(parsed.data.doctorId, today);
  const time = pickWalkInTimeSlot(slots);
  const priority = parsed.data.type === "emergency" ? "emergency" : "normal";

  const { data: appointment, error: aptError } = await supabase
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      doctor_id: parsed.data.doctorId,
      appointment_date: today,
      appointment_time: time,
      status: "confirmed",
      type: parsed.data.type,
      priority,
      notes: parsed.data.chiefComplaint.trim(),
      booked_by: profile.id,
    })
    .select()
    .single();

  if (aptError) return { error: aptError.message };

  const feeSetup = await getClinicFeeSetup(clinicId);
  const feeAmount = resolveWalkInFee(
    feeSetup,
    parsed.data.doctorId,
    parsed.data.feeType,
    parsed.data.type,
    parsed.data.customFee
  );

  if (feeAmount <= 0) return { error: "Consultation fee must be greater than zero" };

  await generateQueueToken(clinicId, patientId, appointment.id, parsed.data.doctorId, priority, "paid");

  const { createVisitForAppointmentAction } = await import("@/lib/actions/visits");
  const visitResult = await createVisitForAppointmentAction(appointment.id).catch(() => null);

  const visitId =
    visitResult && "visitId" in visitResult
      ? visitResult.visitId
      : visitResult && "visit" in visitResult && visitResult.visit
        ? (visitResult.visit as { id: string }).id
        : undefined;

  const billResult = await createWalkInBillWithPayment(supabase, {
    clinicId,
    patientId,
    appointmentId: appointment.id,
    visitId,
    amount: feeAmount,
    taxRate: feeSetup.taxRate,
    feeType: parsed.data.feeType === "custom" ? "custom" : parsed.data.type === "emergency" ? "emergency" : "normal",
    paymentMethod: parsed.data.paymentMethod,
    recordedBy: profile.id,
    chiefComplaint: parsed.data.chiefComplaint.trim(),
  });

  if (billResult.error) return { error: billResult.error };

  if (visitId) {
    await supabase.from("clinic_visits").update({ payment_status: "paid" }).eq("id", visitId);
  }

  await supabase
    .from("queue_tokens")
    .update({ payment_status: "paid" })
    .eq("appointment_id", appointment.id);

  revalidatePath("/owner/appointments");
  revalidatePath("/receptionist/appointments");
  revalidatePath("/owner/queue");
  revalidatePath("/receptionist/queue");
  revalidatePath("/owner/patients");
  revalidatePath("/owner/billing");
  revalidatePath("/receptionist/billing");
  revalidatePath("/finance/billing");
  revalidatePath("/owner/revenue");
  revalidatePath("/finance");
  revalidatePath("/owner");

  const tokenResult = await supabase
    .from("queue_tokens")
    .select("token_label")
    .eq("appointment_id", appointment.id)
    .maybeSingle();

  return {
    success: true,
    patientId,
    patientCode,
    appointmentId: appointment.id,
    tokenLabel: tokenResult.data?.token_label ?? null,
    time,
    isExistingPatient: !!existingPatient,
    visitId,
    invoiceNumber: billResult.invoiceNumber,
    receiptNumber: billResult.receiptNumber,
    totalAmount: billResult.totalAmount,
    paymentMethod: parsed.data.paymentMethod,
  };
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
    .select("*, patients(full_name, user_id)")
    .single();

  if (error) return { error: error.message };

  if (status === "confirmed" && data) {
    const { createVisitForAppointmentAction } = await import("@/lib/actions/visits");
    await createVisitForAppointmentAction(appointmentId).catch(() => null);

    const patient = data.patients as { user_id: string | null; full_name: string } | null;
    if (patient?.user_id) {
      await createNotification({
        userId: patient.user_id,
        clinicId: data.clinic_id,
        type: "appointment_reminder",
        title: "Appointment Confirmed",
        body: `Your appointment on ${data.appointment_date} at ${data.appointment_time} has been confirmed.`,
      });
    }
  }

  if ((status === "rejected" || status === "cancelled" || status === "no_show") && data) {
    const patient = data.patients as { user_id: string | null; full_name: string } | null;
    if (patient?.user_id) {
      await createNotification({
        userId: patient.user_id,
        clinicId: data.clinic_id,
        type: status === "cancelled" ? "cancellation" : "general",
        title: status === "rejected" ? "Appointment Declined" : "Appointment Cancelled",
        body: reason
          ? `Your appointment was ${status === "rejected" ? "declined" : "cancelled"}: ${reason}`
          : `Your appointment on ${data.appointment_date} at ${data.appointment_time} was ${status === "rejected" ? "declined" : "cancelled"}.`,
      });
    }

    if (status === "cancelled" || status === "no_show") {
      await notifyCancellation({
        clinicId: data.clinic_id,
        patientName: patient?.full_name ?? "Patient",
        date: data.appointment_date,
        time: data.appointment_time,
        reason,
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
  priority: "normal" | "vip" | "emergency" = "normal",
  paymentStatus: PaymentStatus = "not_required"
) {
  const series: TokenSeries =
    priority === "emergency" ? "emergency" : priority === "vip" ? "vip" : "regular";
  return generateQueueTokenWithSeries(clinicId, patientId, series, {
    appointmentId,
    doctorId,
    priority,
    paymentStatus,
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
  const { data: doctor } = await supabase.from("doctors").select("clinic_id").eq("id", doctorId).single();
  if (!doctor?.clinic_id) return [];

  const { getAvailableSlotsForDoctor } = await import("@/lib/portal/slots");
  return getAvailableSlotsForDoctor({ doctorId, clinicId: doctor.clinic_id, date });
}
