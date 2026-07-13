import { createServiceClient } from "@/lib/supabase/server";
import { normalizeIndianPhone } from "@/lib/validations/phone";

export interface ConversationListItem {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  status: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  channel: string;
}

export interface ConversationMessage {
  id: string;
  direction: string;
  sender_type: string;
  content: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
}

export async function listConversations(
  clinicId: string,
  options?: { status?: string; limit?: number }
): Promise<ConversationListItem[]> {
  const service = await createServiceClient();
  let query = service
    .from("conversations")
    .select(
      "id, patient_name, patient_phone, status, last_message_preview, last_message_at, unread_count, channel"
    )
    .eq("clinic_id", clinicId)
    .neq("status", "archived")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(options?.limit ?? 50);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data } = await query;
  return (data ?? []) as ConversationListItem[];
}

export async function getConversationMessages(
  clinicId: string,
  conversationId: string
): Promise<ConversationMessage[]> {
  const service = await createServiceClient();
  const { data } = await service
    .from("conversation_messages")
    .select("id, direction, sender_type, content, status, created_at, sent_at, delivered_at, read_at")
    .eq("clinic_id", clinicId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (data ?? []) as ConversationMessage[];
}

export async function markConversationRead(clinicId: string, conversationId: string) {
  const service = await createServiceClient();
  await service
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("clinic_id", clinicId)
    .eq("id", conversationId);
}

export async function upsertConversationFromInbound(params: {
  clinicId: string;
  phone: string;
  patientName?: string;
  preview: string;
  patientId?: string;
}): Promise<string> {
  const service = await createServiceClient();
  const normalizedPhone = normalizeIndianPhone(params.phone);
  const channelIdentifier = `91${normalizedPhone}`;
  const now = new Date().toISOString();
  const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  let patientName = params.patientName ?? "Unknown";
  let patientId = params.patientId;

  if (!patientId) {
    const { data: patient } = await service
      .from("patients")
      .select("id, full_name")
      .eq("clinic_id", params.clinicId)
      .eq("phone", normalizedPhone)
      .maybeSingle();
    if (patient) {
      patientId = patient.id;
      patientName = patient.full_name ?? patientName;
    }
  }

  const { data: existing } = await service
    .from("conversations")
    .select("id, unread_count")
    .eq("clinic_id", params.clinicId)
    .eq("channel", "whatsapp")
    .eq("channel_identifier", channelIdentifier)
    .maybeSingle();

  if (existing) {
    await service
      .from("conversations")
      .update({
        patient_id: patientId ?? null,
        patient_name: patientName,
        patient_phone: normalizedPhone,
        status: "open",
        last_message_at: now,
        last_message_preview: params.preview.slice(0, 120),
        last_message_direction: "inbound",
        last_inbound_at: now,
        session_expires_at: sessionExpires,
        unread_count: (existing.unread_count ?? 0) + 1,
        updated_at: now,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: created } = await service
    .from("conversations")
    .insert({
      clinic_id: params.clinicId,
      patient_id: patientId ?? null,
      channel: "whatsapp",
      channel_identifier: channelIdentifier,
      patient_name: patientName,
      patient_phone: normalizedPhone,
      status: "open",
      last_message_at: now,
      last_message_preview: params.preview.slice(0, 120),
      last_message_direction: "inbound",
      last_inbound_at: now,
      session_expires_at: sessionExpires,
      unread_count: 1,
    })
    .select("id")
    .single();

  return created!.id;
}

export async function recordConversationMessage(params: {
  clinicId: string;
  conversationId: string;
  patientId?: string;
  direction: "inbound" | "outbound" | "system";
  senderType: "patient" | "staff" | "ai" | "system" | "campaign";
  content: string;
  status?: string;
  externalMessageId?: string;
  intent?: string;
  senderProfileId?: string;
  metadata?: Record<string, unknown>;
}): Promise<string | undefined> {
  const service = await createServiceClient();
  const now = new Date().toISOString();

  const { data } = await service
    .from("conversation_messages")
    .insert({
      clinic_id: params.clinicId,
      conversation_id: params.conversationId,
      patient_id: params.patientId ?? null,
      direction: params.direction,
      sender_type: params.senderType,
      sender_profile_id: params.senderProfileId ?? null,
      content: params.content,
      status: params.status ?? (params.direction === "outbound" ? "sent" : "delivered"),
      external_message_id: params.externalMessageId ?? null,
      intent: params.intent ?? null,
      metadata: params.metadata ?? {},
      sent_at: params.direction === "outbound" ? now : null,
      delivered_at: params.direction === "inbound" ? now : null,
    })
    .select("id")
    .single();

  const updates: Record<string, unknown> = {
    last_message_at: now,
    last_message_preview: params.content.slice(0, 120),
    last_message_direction: params.direction,
    updated_at: now,
  };

  if (params.direction === "outbound") {
    updates.last_outbound_at = now;
  }

  await service
    .from("conversations")
    .update(updates)
    .eq("id", params.conversationId);

  return data?.id;
}

export async function updateConversationMessageStatus(
  externalMessageId: string,
  status: "delivered" | "read" | "failed",
  failedReason?: string
) {
  const service = await createServiceClient();
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status };

  if (status === "delivered") updates.delivered_at = now;
  if (status === "read") {
    updates.read_at = now;
    updates.delivered_at = now;
  }
  if (status === "failed") updates.failed_reason = failedReason ?? "Delivery failed";

  await service
    .from("conversation_messages")
    .update(updates)
    .eq("external_message_id", externalMessageId);
}
