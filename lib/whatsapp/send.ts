import { createServiceClient } from "@/lib/supabase/server";
import { normalizeIndianPhone } from "@/lib/validations/phone";
import { getClinicWhatsAppCredentials } from "@/lib/whatsapp/connections";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/meta-client";
import {
  upsertConversationFromInbound,
  recordConversationMessage,
  updateConversationMessageStatus,
} from "@/lib/conversations/service";

export interface SendWhatsAppParams {
  clinicId: string;
  patientId?: string;
  patientPhone: string;
  content: string;
  intent?: string;
  deliveryStatus?: "scheduled" | "sent";
  scheduledAt?: string;
  metadata?: Record<string, unknown>;
  conversationId?: string;
  senderProfileId?: string;
  senderType?: "staff" | "ai" | "system" | "campaign";
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  externalMessageId?: string;
  error?: string;
  simulated?: boolean;
}

async function sendViaMetaApi(
  clinicId: string,
  toPhone: string,
  content: string
): Promise<{ externalId?: string; error?: string; simulated?: boolean }> {
  const credentials = await getClinicWhatsAppCredentials(clinicId);

  if (credentials) {
    if (credentials.accessToken === "simulated-token") {
      return { externalId: `sim_${Date.now()}`, simulated: true };
    }
    const result = await sendWhatsAppTextMessage({
      phoneNumberId: credentials.phoneNumberId,
      accessToken: credentials.accessToken,
      toPhone,
      content,
    });
    return { externalId: result.externalId, error: result.error };
  }

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    if (process.env.NODE_ENV === "development") {
      return { externalId: `sim_${Date.now()}`, simulated: true };
    }
    return { error: "WhatsApp API not configured" };
  }

  const result = await sendWhatsAppTextMessage({
    phoneNumberId,
    accessToken: token,
    toPhone,
    content,
  });
  return { externalId: result.externalId, error: result.error };
}

export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<SendWhatsAppResult> {
  const service = await createServiceClient();
  const phone = normalizeIndianPhone(params.patientPhone);
  const now = new Date().toISOString();
  const shouldSendNow = params.deliveryStatus !== "scheduled";
  const toPhone = `91${phone}`;

  let externalMessageId: string | undefined;
  let sendError: string | undefined;
  let simulated = false;

  if (shouldSendNow) {
    const apiResult = await sendViaMetaApi(params.clinicId, toPhone, params.content);
    if (apiResult.externalId) {
      externalMessageId = apiResult.externalId;
      simulated = apiResult.simulated ?? false;
    } else if (apiResult.error) {
      if (process.env.NODE_ENV === "development") {
        simulated = true;
        externalMessageId = `sim_${Date.now()}`;
      } else {
        sendError = apiResult.error;
      }
    }
  }

  const deliveryStatus = sendError
    ? "failed"
    : shouldSendNow
      ? simulated || externalMessageId
        ? "sent"
        : "scheduled"
      : "scheduled";

  const { data: row, error: dbError } = await service
    .from("whatsapp_messages")
    .insert({
      clinic_id: params.clinicId,
      patient_id: params.patientId ?? null,
      patient_phone: phone,
      direction: "outbound",
      content: params.content,
      intent: params.intent ?? null,
      metadata: params.metadata ?? {},
      delivery_status: deliveryStatus,
      scheduled_at: params.scheduledAt ?? (shouldSendNow ? now : null),
      sent_at: shouldSendNow && !sendError ? now : null,
      failed_reason: sendError ?? null,
      external_message_id: externalMessageId ?? null,
    })
    .select("id")
    .single();

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  let conversationId = params.conversationId;
  if (!conversationId) {
    conversationId = await upsertConversationFromInbound({
      clinicId: params.clinicId,
      phone,
      patientId: params.patientId,
      preview: params.content,
    });
  }

  await recordConversationMessage({
    clinicId: params.clinicId,
    conversationId,
    patientId: params.patientId,
    direction: "outbound",
    senderType: params.senderType ?? "system",
    content: params.content,
    status: sendError ? "failed" : simulated || externalMessageId ? "sent" : "queued",
    externalMessageId,
    intent: params.intent,
    senderProfileId: params.senderProfileId,
    metadata: params.metadata,
  });

  return {
    success: !sendError,
    messageId: row?.id,
    externalMessageId,
    error: sendError,
    simulated,
  };
}

export async function updateWhatsAppDeliveryStatus(
  externalMessageId: string,
  status: "delivered" | "read" | "failed",
  failedReason?: string
) {
  const service = await createServiceClient();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    delivery_status: status,
  };

  if (status === "delivered") updates.delivered_at = now;
  if (status === "read") {
    updates.read_at = now;
    updates.delivered_at = now;
  }
  if (status === "failed") updates.failed_reason = failedReason ?? "Delivery failed";

  await service
    .from("whatsapp_messages")
    .update(updates)
    .eq("external_message_id", externalMessageId);

  await updateConversationMessageStatus(externalMessageId, status, failedReason);

  const { data: msg } = await service
    .from("whatsapp_messages")
    .select("id")
    .eq("external_message_id", externalMessageId)
    .maybeSingle();

  if (msg?.id) {
    const reminderStatus =
      status === "delivered" ? "delivered" : status === "read" ? "read" : "failed";

    await service
      .from("follow_up_reminders")
      .update({ status: reminderStatus })
      .eq("whatsapp_message_id", msg.id);
  }
}
