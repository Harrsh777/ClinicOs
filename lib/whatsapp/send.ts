import { createServiceClient } from "@/lib/supabase/server";
import { normalizeIndianPhone } from "@/lib/validations/phone";

export interface SendWhatsAppParams {
  clinicId: string;
  patientId?: string;
  patientPhone: string;
  content: string;
  intent?: string;
  deliveryStatus?: "scheduled" | "sent";
  scheduledAt?: string;
  metadata?: Record<string, unknown>;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  externalMessageId?: string;
  error?: string;
  simulated?: boolean;
}

async function sendViaMetaApi(
  toPhone: string,
  content: string
): Promise<{ externalId?: string; error?: string }> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { error: "WhatsApp API not configured" };
  }

  const to = `91${normalizeIndianPhone(toPhone)}`;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: content },
        }),
      }
    );

    const data = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message: string };
    };

    if (!res.ok) {
      return { error: data.error?.message ?? `WhatsApp API error (${res.status})` };
    }

    return { externalId: data.messages?.[0]?.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "WhatsApp send failed" };
  }
}

export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<SendWhatsAppResult> {
  const service = await createServiceClient();
  const phone = normalizeIndianPhone(params.patientPhone);
  const now = new Date().toISOString();
  const shouldSendNow = params.deliveryStatus !== "scheduled";

  let externalMessageId: string | undefined;
  let sendError: string | undefined;
  let simulated = false;

  if (shouldSendNow) {
    const apiResult = await sendViaMetaApi(phone, params.content);
    if (apiResult.externalId) {
      externalMessageId = apiResult.externalId;
    } else if (apiResult.error) {
      if (process.env.NODE_ENV === "development" || !process.env.WHATSAPP_API_TOKEN) {
        simulated = true;
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
