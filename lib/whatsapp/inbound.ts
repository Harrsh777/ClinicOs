import { createServiceClient } from "@/lib/supabase/server";
import { normalizeIndianPhone } from "@/lib/validations/phone";
import { handleEngagementReply } from "@/lib/actions/follow-up-reminders";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import {
  parseAppointmentMessage,
  formatHelpReply,
} from "@/lib/ai/appointment-bot";
import { parseFollowUpResponse, getFollowUpStatus } from "@/lib/ai/follow-up";
import { logAIUsage } from "@/lib/ai/usage-logger";
import {
  handleWhatsAppBooking,
  cancelUpcomingAppointment,
  continueBookingSession,
  getActiveBookingSession,
} from "@/lib/whatsapp/booking";

export interface InboundWhatsAppMessage {
  phone: string;
  message: string;
  clinicId?: string;
  phoneNumberId?: string;
}

export async function resolveClinicFromPhoneNumberId(
  phoneNumberId: string
): Promise<string | undefined> {
  const service = await createServiceClient();

  const { data: byMetaId } = await service
    .from("clinic_branding")
    .select("clinic_id")
    .eq("whatsapp_meta_phone_id", phoneNumberId)
    .maybeSingle();

  if (byMetaId?.clinic_id) return byMetaId.clinic_id;

  const { data: fallback } = await service
    .from("clinic_branding")
    .select("clinic_id")
    .not("whatsapp_number", "is", null)
    .limit(1)
    .maybeSingle();

  return fallback?.clinic_id;
}

async function getClinicName(clinicId: string): Promise<string> {
  const service = await createServiceClient();
  const { data } = await service.from("clinics").select("name").eq("id", clinicId).single();
  return data?.name ?? "your clinic";
}

export async function processInboundWhatsApp(
  input: InboundWhatsAppMessage
): Promise<{ reply: string; intent?: string }> {
  const service = await createServiceClient();
  const phone = normalizeIndianPhone(input.phone);
  const message = input.message.trim();

  let resolvedClinicId = input.clinicId;
  if (!resolvedClinicId && input.phoneNumberId) {
    resolvedClinicId = await resolveClinicFromPhoneNumberId(input.phoneNumberId);
  }
  if (!resolvedClinicId) {
    const { data: branding } = await service
      .from("clinic_branding")
      .select("clinic_id")
      .not("whatsapp_number", "is", null)
      .limit(1)
      .maybeSingle();
    resolvedClinicId = branding?.clinic_id;
  }

  if (!resolvedClinicId) {
    return {
      reply: "Welcome to ClinicOS! Please contact your clinic directly.",
    };
  }

  const clinicName = await getClinicName(resolvedClinicId);

  await service.from("whatsapp_messages").insert({
    clinic_id: resolvedClinicId,
    patient_phone: phone,
    direction: "inbound",
    content: message,
  });

  const engagement = await handleEngagementReply({
    clinicId: resolvedClinicId,
    patientPhone: phone,
    message,
  });

  if (engagement.handled && engagement.reply) {
    await sendWhatsAppMessage({
      clinicId: resolvedClinicId,
      patientPhone: phone,
      content: engagement.reply,
      intent: "engagement_reply_ack",
    });
    return { reply: engagement.reply, intent: "engagement_reply" };
  }

  const intent = parseAppointmentMessage(message);
  await logAIUsage(resolvedClinicId, "appointment_bot", 0, { intent: intent.intent });

  let reply = "Thank you for your message. A clinic staff member will respond shortly.";
  let outboundIntent: string = intent.intent;

  if (intent.intent === "help") {
    reply = formatHelpReply(clinicName);
  } else if (intent.intent === "cancel") {
    reply = await cancelUpcomingAppointment(resolvedClinicId, phone);
  } else if (intent.intent === "book") {
    const booking = await handleWhatsAppBooking({
      clinicId: resolvedClinicId,
      phone,
      message,
      intent,
    });
    reply = booking.reply;
    outboundIntent = booking.booked ? "book_confirmed" : "book_collecting";
  } else if (intent.intent === "status") {
    const { data: patient } = await service
      .from("patients")
      .select("id")
      .eq("clinic_id", resolvedClinicId)
      .eq("phone", phone)
      .maybeSingle();

    if (patient) {
      const { data: apt } = await service
        .from("appointments")
        .select("appointment_date, appointment_time, status, booking_symptoms, appointment_number")
        .eq("patient_id", patient.id)
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .in("status", ["confirmed", "pending"])
        .order("appointment_date")
        .order("appointment_time")
        .limit(1)
        .maybeSingle();

      reply = apt
        ? `Your next consultation is on ${apt.appointment_date} at ${apt.appointment_time} (${apt.status}).` +
          (apt.booking_symptoms ? ` Reason: ${apt.booking_symptoms}.` : "") +
          (apt.appointment_number ? ` Ref: ${apt.appointment_number}.` : "")
        : "You have no upcoming consultations. Reply BOOK to schedule one.";
    } else {
      reply = "We couldn't find your patient record. Please register at the clinic first.";
    }
  } else {
    const activeSession = await getActiveBookingSession(resolvedClinicId, phone);
    if (activeSession) {
      const continued = await continueBookingSession({
        clinicId: resolvedClinicId,
        phone,
        message,
      });
      if (continued.handled) {
        reply = continued.reply;
        outboundIntent = "book_collecting";
      }
    }
  }

  const followUpResponse = parseFollowUpResponse(message);
  if (followUpResponse !== "unknown") {
    const status = getFollowUpStatus(followUpResponse);
    const { data: patient } = await service
      .from("patients")
      .select("id")
      .eq("clinic_id", resolvedClinicId)
      .eq("phone", phone)
      .maybeSingle();

    if (patient) {
      await service
        .from("follow_up_tasks")
        .update({ status, response: message, responded_at: new Date().toISOString() })
        .eq("clinic_id", resolvedClinicId)
        .eq("patient_id", patient.id)
        .eq("status", "sent");
    }

    reply =
      followUpResponse === "yes"
        ? "Great! Keep taking your medicines as prescribed."
        : "Thank you for letting us know. Your doctor will be notified.";
    outboundIntent = "follow_up";
  }

  await sendWhatsAppMessage({
    clinicId: resolvedClinicId,
    patientPhone: phone,
    content: reply,
    intent: outboundIntent,
  });

  return { reply, intent: outboundIntent };
}

export function extractMetaInboundMessage(body: Record<string, unknown>): InboundWhatsAppMessage | null {
  const entry = (body.entry as { changes?: { value?: {
    messages?: { from: string; text?: { body: string }; type: string }[];
    metadata?: { phone_number_id?: string };
  } }[] }[])?.[0];
  const value = entry?.changes?.[0]?.value;
  const msg = value?.messages?.[0];
  if (!msg || msg.type !== "text" || !msg.text?.body) return null;

  return {
    phone: msg.from,
    message: msg.text.body,
    phoneNumberId: value?.metadata?.phone_number_id,
  };
}
