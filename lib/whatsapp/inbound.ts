import { createServiceClient } from "@/lib/supabase/server";
import { normalizeIndianPhone } from "@/lib/validations/phone";
import { handleEngagementReply } from "@/lib/actions/follow-up-reminders";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { getConnectionByPhoneNumberId } from "@/lib/whatsapp/connections";
import {
  upsertConversationFromInbound,
  recordConversationMessage,
} from "@/lib/conversations/service";
import { logAIUsage } from "@/lib/ai/usage-logger";
import { handleConciergeMessage } from "@/lib/whatsapp/concierge/handler";
import { isRetentionBookingReply } from "@/lib/whatsapp/concierge/retention-reply";
import { getConciergeSession } from "@/lib/whatsapp/concierge/session";
import { isBookingIntent, parseMenuChoice } from "@/lib/whatsapp/concierge/menu";

export interface InboundWhatsAppMessage {
  phone: string;
  message: string;
  clinicId?: string;
  phoneNumberId?: string;
}

export async function resolveClinicFromPhoneNumberId(
  phoneNumberId: string
): Promise<string | undefined> {
  const connection = await getConnectionByPhoneNumberId(phoneNumberId);
  if (connection?.clinic_id) return connection.clinic_id;

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

async function getClinicContext(clinicId: string) {
  const service = await createServiceClient();
  const { data } = await service
    .from("clinics")
    .select("name, slug, phone")
    .eq("id", clinicId)
    .single();

  const { data: branding } = await service
    .from("clinic_branding")
    .select("whatsapp_number")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  return {
    name: data?.name ?? "your clinic",
    slug: data?.slug ?? null,
    phone: branding?.whatsapp_number ?? data?.phone ?? null,
  };
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

  const clinic = await getClinicContext(resolvedClinicId);

  await service.from("whatsapp_messages").insert({
    clinic_id: resolvedClinicId,
    patient_phone: phone,
    direction: "inbound",
    content: message,
  });

  const conversationId = await upsertConversationFromInbound({
    clinicId: resolvedClinicId,
    phone,
    preview: message,
  });

  await recordConversationMessage({
    clinicId: resolvedClinicId,
    conversationId,
    direction: "inbound",
    senderType: "patient",
    content: message,
    status: "delivered",
  });

  const activeSession = await getConciergeSession(resolvedClinicId, phone);
  const retentionBookReply = await isRetentionBookingReply(resolvedClinicId, phone, message);

  const skipEngagement =
    retentionBookReply ||
    isBookingIntent(message) ||
    Boolean(parseMenuChoice(message)) ||
    (activeSession?.step && activeSession.step !== "menu");

  if (!skipEngagement) {
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
  }

  const concierge = await handleConciergeMessage({
    clinicId: resolvedClinicId,
    phone,
    message,
    clinicName: clinic.name,
    clinicPhone: clinic.phone,
    clinicSlug: clinic.slug,
  });

  await logAIUsage(resolvedClinicId, "whatsapp_concierge", 0, {
    intent: concierge.intent,
    booked: concierge.booked ?? false,
  });

  await sendWhatsAppMessage({
    clinicId: resolvedClinicId,
    patientPhone: phone,
    content: concierge.reply,
    intent: concierge.intent,
    metadata: concierge.appointmentId
      ? { appointmentId: concierge.appointmentId, source: "whatsapp_concierge" }
      : { source: "whatsapp_concierge" },
  });

  return { reply: concierge.reply, intent: concierge.intent };
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
