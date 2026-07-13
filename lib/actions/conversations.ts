"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import {
  listConversations,
  getConversationMessages,
  markConversationRead,
} from "@/lib/conversations/service";
import { getActiveConnection } from "@/lib/whatsapp/connections";

const STAFF_ROLES = ["clinic_owner", "receptionist", "administrator", "doctor"] as const;

export async function getConversationsInboxAction() {
  const profile = await requireRole([...STAFF_ROLES]);
  if (!profile.clinic_id) return { conversations: [], connection: null };

  const [conversations, connection] = await Promise.all([
    listConversations(profile.clinic_id),
    getActiveConnection(profile.clinic_id),
  ]);

  return { conversations, connection };
}

export async function getConversationThreadAction(conversationId: string) {
  const profile = await requireRole([...STAFF_ROLES]);
  if (!profile.clinic_id) return { messages: [], error: "No clinic assigned" };

  const service = await createServiceClient();
  const { data: conversation } = await service
    .from("conversations")
    .select("id, patient_name, patient_phone, status, session_expires_at")
    .eq("clinic_id", profile.clinic_id)
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return { messages: [], error: "Conversation not found" };

  const messages = await getConversationMessages(profile.clinic_id, conversationId);
  await markConversationRead(profile.clinic_id, conversationId);

  return { conversation, messages };
}

export async function sendConversationMessageAction(conversationId: string, content: string) {
  const profile = await requireRole([...STAFF_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Message cannot be empty" };

  const service = await createServiceClient();
  const { data: conversation } = await service
    .from("conversations")
    .select("id, patient_phone, patient_id, patient_name")
    .eq("clinic_id", profile.clinic_id)
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation?.patient_phone) {
    return { error: "Conversation not found or missing patient phone" };
  }

  const result = await sendWhatsAppMessage({
    clinicId: profile.clinic_id,
    patientId: conversation.patient_id ?? undefined,
    patientPhone: conversation.patient_phone,
    content: trimmed,
    intent: "staff_reply",
    conversationId,
    senderProfileId: profile.id,
    senderType: "staff",
  });

  if (!result.success && !result.simulated) {
    return { error: result.error ?? "Failed to send message" };
  }

  revalidatePath("/owner/conversations");
  revalidatePath("/receptionist/conversations");
  return { success: true, messageId: result.messageId };
}

export async function startConversationAction(patientPhone: string, patientName?: string) {
  const profile = await requireRole(["clinic_owner", "receptionist"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const service = await createServiceClient();
  const phone = patientPhone.replace(/\D/g, "").slice(-10);
  if (phone.length !== 10) return { error: "Enter a valid 10-digit phone number" };

  const channelIdentifier = `91${phone}`;

  const { data: patient } = await service
    .from("patients")
    .select("id, full_name")
    .eq("clinic_id", profile.clinic_id)
    .eq("phone", phone)
    .maybeSingle();

  const name = patientName ?? patient?.full_name ?? "Unknown";

  const { data: existing } = await service
    .from("conversations")
    .select("id")
    .eq("clinic_id", profile.clinic_id)
    .eq("channel", "whatsapp")
    .eq("channel_identifier", channelIdentifier)
    .maybeSingle();

  if (existing) return { conversationId: existing.id };

  const { data: created, error } = await service
    .from("conversations")
    .insert({
      clinic_id: profile.clinic_id,
      patient_id: patient?.id ?? null,
      channel: "whatsapp",
      channel_identifier: channelIdentifier,
      patient_name: name,
      patient_phone: phone,
      status: "open",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/owner/conversations");
  return { conversationId: created.id };
}
