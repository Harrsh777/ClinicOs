"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { signVisit } from "@/lib/visits/qr";
import { generateQueueTokenWithSeriesForClient } from "@/lib/actions/appointments";
import { deriveBillStatus } from "@/lib/billing/calculator";
import { requirePortalSession } from "@/lib/portal/session";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { getCurrentTimeInClinicTz, getTodayDateInClinicTz } from "@/lib/portal/clinic-hours";
import { validateWalkInRequest, getPortalQueueStats } from "@/lib/portal/walk-in";
import { z } from "zod";

const bookSchema = z.object({
  clinicSlug: z.string().min(1),
  fullName: z.string().min(2),
  phone: z.string().min(10),
  doctorId: z.string().uuid(),
  date: z.string(),
  time: z.string(),
});

const walkInSchema = z.object({
  clinicSlug: z.string().min(1),
  fullName: z.string().min(2),
  phone: z.string().min(10),
  doctorId: z.string().uuid().optional(),
});

async function generateCodes() {
  const visitCode = `VIS-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const bookingId = `BK-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
  return { visitCode, bookingId, signature: signVisit(visitCode) };
}

async function upsertPortalPatient(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  clinicId: string,
  fullName: string,
  phone: string
) {
  const normalized = phone.replace(/\D/g, "").slice(-10);

  const { data: existing } = await service
    .from("patients")
    .select("id")
    .eq("clinic_id", clinicId)
    .ilike("phone", `%${normalized}`)
    .maybeSingle();

  if (existing) {
    await service.from("patients").update({ full_name: fullName }).eq("id", existing.id);
    return existing.id;
  }

  const { count } = await service
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId);

  const patientCode = `P${String((count ?? 0) + 1).padStart(4, "0")}`;
  const { data, error } = await service
    .from("patients")
    .insert({
      clinic_id: clinicId,
      full_name: fullName,
      phone: normalized,
      patient_code: patientCode,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

async function getConsultationFee(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  clinicId: string,
  doctorId: string
) {
  const [{ data: doctor }, { data: clinic }] = await Promise.all([
    service.from("doctors").select("consultation_fee").eq("id", doctorId).single(),
    service.from("clinics").select("consultation_fee_default").eq("id", clinicId).single(),
  ]);
  return Number(doctor?.consultation_fee ?? clinic?.consultation_fee_default ?? 500);
}

async function resolveWalkInDoctor(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  clinicId: string,
  preferredDoctorId?: string
) {
  if (preferredDoctorId) {
    const { data } = await service
      .from("doctors")
      .select("id")
      .eq("id", preferredDoctorId)
      .eq("clinic_id", clinicId)
      .eq("is_accepting_appointments", true)
      .maybeSingle();
    if (data) return data.id;
  }

  const { data: doctors } = await service
    .from("doctors")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("is_accepting_appointments", true);

  if (!doctors?.length) return null;

  const today = getTodayDateInClinicTz();
  const { data: session } = await service
    .from("queue_sessions")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("session_date", today)
    .maybeSingle();

  if (!session) return doctors[0].id;

  let bestDoctorId = doctors[0].id;
  let minWaiting = Number.POSITIVE_INFINITY;

  for (const doctor of doctors) {
    const { count } = await service
      .from("queue_tokens")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id)
      .eq("doctor_id", doctor.id)
      .eq("status", "waiting");

    const waiting = count ?? 0;
    if (waiting < minWaiting) {
      minWaiting = waiting;
      bestDoctorId = doctor.id;
    }
  }

  return bestDoctorId;
}

async function createPortalCheckout(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  params: {
    clinicId: string;
    clinicName: string;
    clinicSlug: string;
    patientId: string;
    visitId: string;
    appointmentId: string;
    bookingId: string;
    doctorId: string;
    fee: number;
    lineDescription: string;
    paymentNote: string;
  }
) {
  const { data: settings } = await service
    .from("clinic_billing_settings")
    .select("invoice_prefix, tax_rate")
    .eq("clinic_id", params.clinicId)
    .maybeSingle();

  const prefix = settings?.invoice_prefix ?? "INV";
  const { count: billCount } = await service
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", params.clinicId);

  const invoiceNumber = `${prefix}-${String((billCount ?? 0) + 1).padStart(5, "0")}`;
  const taxRate = Number(settings?.tax_rate ?? 0);
  const taxAmount = Math.round(params.fee * taxRate) / 100;
  const totalAmount = params.fee + taxAmount;

  const { data: bill, error: billErr } = await service
    .from("bills")
    .insert({
      clinic_id: params.clinicId,
      patient_id: params.patientId,
      invoice_number: invoiceNumber,
      status: "unpaid",
      subtotal: params.fee,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      paid_amount: 0,
      patient_amount: totalAmount,
      notes: params.paymentNote,
    })
    .select()
    .single();

  if (billErr) return { error: billErr.message };

  await service.from("bill_line_items").insert({
    bill_id: bill.id,
    clinic_id: params.clinicId,
    description: params.lineDescription,
    item_type: "consultation",
    quantity: 1,
    unit_price: params.fee,
    amount: params.fee,
    reference_id: params.appointmentId,
  });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    if (process.env.NODE_ENV === "development") {
      await fulfillPortalPayment(params.visitId, bill.id, "dev-mock", totalAmount);
      return {
        success: true,
        mockPayment: true,
        bookingId: params.bookingId,
        visitId: params.visitId,
        fee: totalAmount,
      };
    }
    return { error: "Online payment is not configured for this clinic." };
  }

  const Razorpay = (await import("razorpay")).default;
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const amountPaise = Math.round(totalAmount * 100);

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: invoiceNumber,
    notes: {
      bill_id: bill.id,
      visit_id: params.visitId,
      type: "portal_booking",
      clinic_id: params.clinicId,
    },
  });

  await service.from("payments").insert({
    bill_id: bill.id,
    clinic_id: params.clinicId,
    patient_id: params.patientId,
    visit_id: params.visitId,
    amount: totalAmount,
    method: "upi",
    status: "pending",
    gateway_ref: order.id,
  });

  return {
    success: true,
    bookingId: params.bookingId,
    visitId: params.visitId,
    billId: bill.id,
    orderId: order.id,
    amount: amountPaise,
    keyId,
    clinicName: params.clinicName,
    fee: totalAmount,
  };
}

export async function createPortalBookingAction(input: z.infer<typeof bookSchema>) {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid booking details" };

  const clinic = await getPublicClinicBySlug(parsed.data.clinicSlug);
  if (!clinic) return { error: "Clinic not found" };

  const auth = await requirePortalSession(parsed.data.phone, clinic.id);
  if ("error" in auth) return { error: auth.error };

  const service = await createServiceClient();
  const today = getTodayDateInClinicTz();
  const fee = await getConsultationFee(service, clinic.id, parsed.data.doctorId);

  const { data: doctor } = await service
    .from("doctors")
    .select("clinic_id")
    .eq("id", parsed.data.doctorId)
    .eq("clinic_id", clinic.id)
    .single();

  if (!doctor) return { error: "Doctor not found" };

  const { data: conflict } = await service
    .from("appointments")
    .select("id")
    .eq("doctor_id", parsed.data.doctorId)
    .eq("appointment_date", parsed.data.date)
    .eq("appointment_time", parsed.data.time)
    .neq("status", "cancelled")
    .maybeSingle();

  if (conflict) return { error: "This slot was just booked. Pick another time." };

  try {
    const patientId = await upsertPortalPatient(service, clinic.id, parsed.data.fullName, parsed.data.phone);

    const { data: appointment, error: aptErr } = await service
      .from("appointments")
      .insert({
        clinic_id: clinic.id,
        patient_id: patientId,
        doctor_id: parsed.data.doctorId,
        appointment_date: parsed.data.date,
        appointment_time: parsed.data.time,
        status: "pending",
        type: "scheduled",
        priority: "normal",
        notes: "Booked via public portal",
      })
      .select()
      .single();

    if (aptErr) return { error: aptErr.message };

    const { visitCode, bookingId, signature } = await generateCodes();

    const { data: visit, error: visitErr } = await service
      .from("clinic_visits")
      .insert({
        visit_code: visitCode,
        booking_id: bookingId,
        clinic_id: clinic.id,
        patient_id: patientId,
        appointment_id: appointment.id,
        visit_type: "scheduled",
        payment_status: "pending",
        check_in_status: "scheduled",
        qr_signature: signature,
      })
      .select()
      .single();

    if (visitErr) return { error: visitErr.message };

    const checkout = await createPortalCheckout(service, {
      clinicId: clinic.id,
      clinicName: clinic.name,
      clinicSlug: clinic.slug,
      patientId,
      visitId: visit.id,
      appointmentId: appointment.id,
      bookingId,
      doctorId: parsed.data.doctorId,
      fee,
      lineDescription: "Consultation Fee (Online Booking)",
      paymentNote: `Portal booking ${bookingId}`,
    });

    if (checkout.error) return { error: checkout.error };
    return { ...checkout, isToday: parsed.data.date === today, bookingType: "scheduled" as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Booking failed" };
  }
}

export async function createPortalWalkInAction(input: z.infer<typeof walkInSchema>) {
  const parsed = walkInSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid walk-in details" };

  const clinic = await getPublicClinicBySlug(parsed.data.clinicSlug);
  if (!clinic) return { error: "Clinic not found" };

  if (!clinic.portal.walkInEnabled) {
    return { error: "Online walk-in is disabled. Please visit the reception desk." };
  }

  const auth = await requirePortalSession(parsed.data.phone, clinic.id);
  if ("error" in auth) return { error: auth.error };

  const validation = await validateWalkInRequest(clinic.id, parsed.data.phone, clinic.opening_hours);
  if (!validation.ok) {
    return {
      error: validation.error,
      existingBookingId: validation.existingBookingId,
    };
  }

  const service = await createServiceClient();
  const today = getTodayDateInClinicTz();
  const nowTime = getCurrentTimeInClinicTz();

  const doctorId = await resolveWalkInDoctor(service, clinic.id, parsed.data.doctorId);
  if (!doctorId) {
    return { error: "No doctors are accepting walk-ins right now. Please visit reception." };
  }

  const fee = await getConsultationFee(service, clinic.id, doctorId);

  try {
    const patientId = await upsertPortalPatient(service, clinic.id, parsed.data.fullName, parsed.data.phone);

    const { data: appointment, error: aptErr } = await service
      .from("appointments")
      .insert({
        clinic_id: clinic.id,
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: today,
        appointment_time: nowTime,
        status: "pending",
        type: "walk_in",
        priority: "normal",
        notes: "Walk-in via public portal",
      })
      .select()
      .single();

    if (aptErr) return { error: aptErr.message };

    const { visitCode, bookingId, signature } = await generateCodes();

    const { data: visit, error: visitErr } = await service
      .from("clinic_visits")
      .insert({
        visit_code: visitCode,
        booking_id: bookingId,
        clinic_id: clinic.id,
        patient_id: patientId,
        appointment_id: appointment.id,
        visit_type: "walk_in",
        payment_status: "pending",
        check_in_status: "scheduled",
        qr_signature: signature,
      })
      .select()
      .single();

    if (visitErr) return { error: visitErr.message };

    const checkout = await createPortalCheckout(service, {
      clinicId: clinic.id,
      clinicName: clinic.name,
      clinicSlug: clinic.slug,
      patientId,
      visitId: visit.id,
      appointmentId: appointment.id,
      bookingId,
      doctorId,
      fee,
      lineDescription: "Walk-in Consultation Fee",
      paymentNote: `Portal walk-in ${bookingId}`,
    });

    if (checkout.error) return { error: checkout.error };

    const queueStats = await getPortalQueueStats(clinic.id);
    return {
      ...checkout,
      bookingType: "walk_in" as const,
      queueStats,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Walk-in registration failed" };
  }
}

export async function getPortalWalkInStatus(clinicSlug: string) {
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) return null;

  const { getClinicHoursStatus } = await import("@/lib/portal/clinic-hours");
  const hours = getClinicHoursStatus(clinic.opening_hours);
  const queueStats = await getPortalQueueStats(clinic.id);

  return {
    walkInEnabled: clinic.portal.walkInEnabled,
    maxDailyWalkIns: clinic.portal.maxDailyWalkIns,
    walkInsToday: queueStats.walkInsToday,
    queueStats,
    isOpen: hours.isOpen,
    hoursMessage: hours.message,
    opensAt: hours.opensAt,
    closesAt: hours.closesAt,
  };
}

export async function fulfillPortalPayment(
  visitId: string,
  billId: string,
  gatewayRef: string,
  amount: number
) {
  const service = await createServiceClient();
  const today = getTodayDateInClinicTz();

  const { data: visit } = await service
    .from("clinic_visits")
    .select("*, appointments(id, doctor_id, appointment_date, status, type)")
    .eq("id", visitId)
    .single();

  if (!visit) return { error: "Visit not found" };

  if (visit.payment_status === "paid" && visit.queue_token_id) {
    return { success: true, tokenLabel: visit.token_label, bookingId: visit.booking_id };
  }

  const { data: bill } = await service.from("bills").select("*").eq("id", billId).single();
  if (!bill) return { error: "Bill not found" };

  await service
    .from("payments")
    .update({
      status: "completed",
      gateway_ref: gatewayRef,
      receipt_number: `RZP-${gatewayRef.slice(-8).toUpperCase()}`,
      paid_at: new Date().toISOString(),
    })
    .eq("bill_id", billId)
    .eq("status", "pending");

  const newPaid = Number(bill.paid_amount) + amount;
  await service
    .from("bills")
    .update({ paid_amount: newPaid, status: deriveBillStatus(Number(bill.total_amount), newPaid) })
    .eq("id", billId);

  await service.from("clinic_visits").update({ payment_status: "paid" }).eq("id", visitId);

  if (visit.appointment_id) {
    await service.from("appointments").update({ status: "confirmed" }).eq("id", visit.appointment_id);
  }

  const apt = visit.appointments as { doctor_id: string; appointment_date: string; type: string } | null;
  const shouldIssueToken =
    !visit.queue_token_id &&
    (visit.visit_type === "walk_in" ||
      visit.visit_type === "emergency" ||
      apt?.appointment_date === today);

  let tokenLabel: string | null = visit.token_label;

  if (shouldIssueToken) {
    const series = visit.visit_type === "emergency" ? "emergency" : "regular";
    const tokenResult = await generateQueueTokenWithSeriesForClient(
      service,
      visit.clinic_id,
      visit.patient_id,
      series,
      {
        appointmentId: visit.appointment_id ?? undefined,
        doctorId: apt?.doctor_id,
        priority: visit.visit_type === "emergency" ? "emergency" : "normal",
        paymentStatus: "paid",
        visitId: visit.id,
      }
    );

    if (!tokenResult.error && tokenResult.token) {
      tokenLabel = tokenResult.token.token_label ?? null;
      await service
        .from("clinic_visits")
        .update({
          queue_token_id: tokenResult.token.id,
          token_label: tokenLabel,
          check_in_status: "in_queue",
          checked_in_at: new Date().toISOString(),
        })
        .eq("id", visitId);

      await service.from("queue_tokens").update({ visit_id: visitId }).eq("id", tokenResult.token.id);
    }
  }

  revalidatePath("/receptionist/queue");
  revalidatePath("/owner/queue");

  return { success: true, tokenLabel, bookingId: visit.booking_id };
}

export async function confirmPortalPaymentAction(params: {
  visitId: string;
  billId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return { error: "Payment not configured" };

  const crypto = await import("crypto");
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  if (expected !== params.signature) return { error: "Invalid payment signature" };

  const service = await createServiceClient();
  const { data: payment } = await service
    .from("payments")
    .select("amount")
    .eq("bill_id", params.billId)
    .eq("gateway_ref", params.orderId)
    .maybeSingle();

  return fulfillPortalPayment(
    params.visitId,
    params.billId,
    params.paymentId,
    Number(payment?.amount ?? 0)
  );
}

export async function getPortalBookingStatus(bookingId: string, clinicSlug: string) {
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) return null;

  const service = await createServiceClient();
  const { data } = await service
    .from("clinic_visits")
    .select(
      "booking_id, token_label, payment_status, check_in_status, visit_code, qr_signature, visit_type, queue_token_id, appointments(appointment_date, appointment_time, type, doctors(profiles(full_name)))"
    )
    .eq("booking_id", bookingId.toUpperCase())
    .eq("clinic_id", clinic.id)
    .maybeSingle();

  if (!data) return null;

  let queuePosition: number | null = null;
  let waitingCount: number | null = null;

  if (data.queue_token_id) {
    const stats = await getPortalQueueStats(clinic.id);
    waitingCount = stats.waiting;

    const { data: token } = await service
      .from("queue_tokens")
      .select("token_number, session_id, status")
      .eq("id", data.queue_token_id)
      .maybeSingle();

    if (token?.status === "waiting") {
      const { count } = await service
        .from("queue_tokens")
        .select("id", { count: "exact", head: true })
        .eq("session_id", token.session_id)
        .eq("status", "waiting")
        .lt("token_number", token.token_number);

      queuePosition = (count ?? 0) + 1;
    }
  }

  return { ...data, queuePosition, waitingCount };
}
