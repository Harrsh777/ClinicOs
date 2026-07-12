import { createServiceClient } from "@/lib/supabase/server";

export type NotificationType =
  | "booking_created"
  | "appointment_reminder"
  | "payment_received"
  | "cancellation"
  | "reschedule"
  | "follow_up_reminder"
  | "missed_appointment"
  | "prescription_ready"
  | "invoice_generated"
  | "general";

interface CreateNotificationParams {
  userId: string;
  clinicId: string;
  title: string;
  body: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
}

/** In-app notification — future channels (email/SMS/WhatsApp) hook here */
export async function createNotification(params: CreateNotificationParams) {
  const service = await createServiceClient();
  const { error } = await service.from("notifications").insert({
    user_id: params.userId,
    clinic_id: params.clinicId,
    title: params.title,
    body: params.body,
    type: params.type,
    metadata: params.metadata ?? {},
    is_read: false,
  });
  if (error) console.error("[notifications]", error.message);
}

export async function notifyClinicStaff(params: {
  clinicId: string;
  roles: string[];
  title: string;
  body: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
}) {
  const service = await createServiceClient();
  const { data: staff } = await service
    .from("profiles")
    .select("id")
    .eq("clinic_id", params.clinicId)
    .in("role", params.roles)
    .eq("is_active", true);

  if (!staff?.length) return;

  const rows = staff.map((s) => ({
    user_id: s.id,
    clinic_id: params.clinicId,
    title: params.title,
    body: params.body,
    type: params.type,
    metadata: params.metadata ?? {},
    is_read: false,
  }));

  await service.from("notifications").insert(rows);
}

export async function notifyBookingCreated(params: {
  clinicId: string;
  patientName: string;
  bookingId: string;
  appointmentNumber?: string;
  doctorName?: string;
  date: string;
  time: string;
}) {
  await notifyClinicStaff({
    clinicId: params.clinicId,
    roles: ["clinic_owner", "receptionist", "administrator"],
    type: "booking_created",
    title: "New booking received",
    body: `${params.patientName} booked for ${params.date} at ${params.time}${params.doctorName ? ` with ${params.doctorName}` : ""}. Booking: ${params.bookingId}`,
    metadata: {
      booking_id: params.bookingId,
      appointment_number: params.appointmentNumber,
    },
  });
}

export async function notifyPaymentReceived(params: {
  clinicId: string;
  patientName: string;
  amount: number;
  bookingId?: string;
  invoiceNumber?: string;
}) {
  await notifyClinicStaff({
    clinicId: params.clinicId,
    roles: ["clinic_owner", "receptionist", "finance_manager"],
    type: "payment_received",
    title: "Payment received",
    body: `₹${params.amount} from ${params.patientName}${params.bookingId ? ` (${params.bookingId})` : ""}`,
    metadata: { booking_id: params.bookingId, invoice_number: params.invoiceNumber },
  });
}

export async function notifyCancellation(params: {
  clinicId: string;
  patientName: string;
  date: string;
  time: string;
  reason?: string;
}) {
  await notifyClinicStaff({
    clinicId: params.clinicId,
    roles: ["clinic_owner", "receptionist", "doctor"],
    type: "cancellation",
    title: "Appointment cancelled",
    body: `${params.patientName} — ${params.date} ${params.time}${params.reason ? `: ${params.reason}` : ""}`,
  });
}

export async function notifyReschedule(params: {
  clinicId: string;
  patientName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
}) {
  await notifyClinicStaff({
    clinicId: params.clinicId,
    roles: ["clinic_owner", "receptionist", "doctor"],
    type: "reschedule",
    title: "Appointment rescheduled",
    body: `${params.patientName}: ${params.oldDate} ${params.oldTime} → ${params.newDate} ${params.newTime}`,
  });
}

export async function notifyInvoiceGenerated(params: {
  clinicId: string;
  patientName: string;
  invoiceNumber: string;
  amount: number;
}) {
  await notifyClinicStaff({
    clinicId: params.clinicId,
    roles: ["clinic_owner", "finance_manager", "receptionist"],
    type: "invoice_generated",
    title: "Invoice generated",
    body: `${params.invoiceNumber} — ₹${params.amount} for ${params.patientName}`,
    metadata: { invoice_number: params.invoiceNumber },
  });
}

export async function notifyPrescriptionReady(params: {
  clinicId: string;
  doctorId: string;
  patientName: string;
  prescriptionId: string;
}) {
  const service = await createServiceClient();
  const { data: patientProfile } = await service
    .from("patients")
    .select("user_id")
    .eq("clinic_id", params.clinicId)
    .maybeSingle();

  if (patientProfile?.user_id) {
    await createNotification({
      userId: patientProfile.user_id,
      clinicId: params.clinicId,
      type: "prescription_ready",
      title: "Prescription ready",
      body: `Your prescription from ${params.patientName} is ready to view.`,
      metadata: { prescription_id: params.prescriptionId },
    });
  }

  await createNotification({
    userId: params.doctorId,
    clinicId: params.clinicId,
    type: "prescription_ready",
    title: "Prescription saved",
    body: `Prescription for ${params.patientName} has been recorded.`,
    metadata: { prescription_id: params.prescriptionId },
  });
}
