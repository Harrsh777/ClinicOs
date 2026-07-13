import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptSecret, encryptSecret } from "@/lib/security/credentials-vault";

export interface WhatsAppConnectionSafe {
  id: string;
  clinic_id: string;
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string;
  business_name: string | null;
  connection_status: string;
  quality_rating: string | null;
  messaging_limit_tier: string | null;
  connected_at: string | null;
  webhook_subscribed: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
}

export interface WhatsAppCredentials {
  clinicId: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
  accessToken: string;
  connectionId: string;
}

export async function getActiveConnection(
  clinicId: string
): Promise<WhatsAppConnectionSafe | null> {
  const service = await createServiceClient();
  const { data } = await service
    .from("whatsapp_connections")
    .select(
      "id, clinic_id, waba_id, phone_number_id, display_phone_number, business_name, connection_status, quality_rating, messaging_limit_tier, connected_at, webhook_subscribed, is_active, metadata"
    )
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .eq("connection_status", "connected")
    .maybeSingle();

  return data as WhatsAppConnectionSafe | null;
}

export async function getConnectionByPhoneNumberId(
  phoneNumberId: string
): Promise<WhatsAppConnectionSafe | null> {
  const service = await createServiceClient();
  const { data } = await service
    .from("whatsapp_connections")
    .select(
      "id, clinic_id, waba_id, phone_number_id, display_phone_number, business_name, connection_status, quality_rating, messaging_limit_tier, connected_at, webhook_subscribed, is_active, metadata"
    )
    .eq("phone_number_id", phoneNumberId)
    .eq("is_active", true)
    .eq("connection_status", "connected")
    .maybeSingle();

  return data as WhatsAppConnectionSafe | null;
}

export async function getClinicWhatsAppCredentials(
  clinicId: string
): Promise<WhatsAppCredentials | null> {
  const service = await createServiceClient();
  const { data } = await service
    .from("whatsapp_connections")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .eq("connection_status", "connected")
    .maybeSingle();

  if (!data?.access_token_encrypted) return null;

  return {
    clinicId: data.clinic_id,
    phoneNumberId: data.phone_number_id,
    wabaId: data.waba_id,
    displayPhoneNumber: data.display_phone_number,
    accessToken: decryptSecret(data.access_token_encrypted),
    connectionId: data.id,
  };
}

export async function storeWhatsAppConnection(
  service: SupabaseClient,
  params: {
    clinicId: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    businessName?: string;
    accessToken: string;
    expiresInSeconds?: number;
    connectedBy?: string;
    metaBusinessId?: string;
    webhookSubscribed?: boolean;
    qualityRating?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ connectionId: string; error?: string }> {
  const now = new Date();
  const expiresAt = params.expiresInSeconds
    ? new Date(now.getTime() + params.expiresInSeconds * 1000).toISOString()
    : new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

  await service
    .from("whatsapp_connections")
    .update({ is_active: false, disconnected_at: now.toISOString(), connection_status: "disconnected" })
    .eq("clinic_id", params.clinicId)
    .eq("is_active", true);

  const { data, error } = await service
    .from("whatsapp_connections")
    .insert({
      clinic_id: params.clinicId,
      waba_id: params.wabaId,
      phone_number_id: params.phoneNumberId,
      display_phone_number: params.displayPhoneNumber,
      business_name: params.businessName ?? null,
      access_token_encrypted: encryptSecret(params.accessToken),
      access_token_expires_at: expiresAt,
      connection_status: "connected",
      connected_at: now.toISOString(),
      connected_by: params.connectedBy ?? null,
      meta_business_id: params.metaBusinessId ?? null,
      webhook_subscribed: params.webhookSubscribed ?? false,
      quality_rating: params.qualityRating ?? null,
      is_active: true,
      metadata: params.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) return { connectionId: "", error: error.message };

  await service
    .from("clinic_branding")
    .upsert(
      {
        clinic_id: params.clinicId,
        whatsapp_number: params.displayPhoneNumber,
        whatsapp_meta_phone_id: params.phoneNumberId,
      },
      { onConflict: "clinic_id" }
    );

  return { connectionId: data.id };
}

export async function disconnectWhatsApp(
  clinicId: string
): Promise<{ success: boolean; error?: string }> {
  const service = await createServiceClient();
  const { error } = await service
    .from("whatsapp_connections")
    .update({
      is_active: false,
      connection_status: "disconnected",
      disconnected_at: new Date().toISOString(),
    })
    .eq("clinic_id", clinicId)
    .eq("is_active", true);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
