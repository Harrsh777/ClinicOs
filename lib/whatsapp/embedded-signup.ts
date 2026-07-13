import { createServiceClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getWabaPhoneNumbers,
  subscribeWabaToApp,
  isMetaConfigured,
} from "@/lib/whatsapp/meta-client";
import { storeWhatsAppConnection } from "@/lib/whatsapp/connections";

export interface EmbeddedSignupSession {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  businessName?: string;
  metaBusinessId?: string;
}

export async function createOAuthState(clinicId: string, profileId: string): Promise<string> {
  const service = await createServiceClient();
  const nonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await service.from("whatsapp_oauth_states").insert({
    clinic_id: clinicId,
    nonce,
    created_by: profileId,
    expires_at: expiresAt,
  });

  return `${clinicId}:${nonce}`;
}

export async function verifyOAuthState(state: string): Promise<{
  valid: boolean;
  clinicId?: string;
  nonce?: string;
}> {
  const parts = state.split(":");
  if (parts.length !== 2) return { valid: false };

  const [clinicId, nonce] = parts;
  const service = await createServiceClient();

  const { data } = await service
    .from("whatsapp_oauth_states")
    .select("id, expires_at, used_at")
    .eq("clinic_id", clinicId)
    .eq("nonce", nonce)
    .maybeSingle();

  if (!data || data.used_at) return { valid: false };
  if (new Date(data.expires_at) < new Date()) return { valid: false };

  await service
    .from("whatsapp_oauth_states")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { valid: true, clinicId, nonce };
}

export async function completeEmbeddedSignup(params: {
  clinicId: string;
  profileId?: string;
  code: string;
  state: string;
  session: EmbeddedSignupSession;
}): Promise<{ success: boolean; error?: string; connectionId?: string }> {
  const stateCheck = await verifyOAuthState(params.state);
  if (!stateCheck.valid || stateCheck.clinicId !== params.clinicId) {
    return { success: false, error: "Invalid or expired OAuth state" };
  }

  if (!isMetaConfigured()) {
    return completeSimulatedSignup(params);
  }

  const tokenResult = await exchangeCodeForToken(params.code);
  if (!tokenResult.data?.access_token) {
    return { success: false, error: tokenResult.error ?? "Failed to exchange authorization code" };
  }

  const longLived = await exchangeForLongLivedToken(tokenResult.data.access_token);
  const accessToken = longLived.data?.access_token ?? tokenResult.data.access_token;
  const expiresIn = longLived.data?.expires_in ?? tokenResult.data.expires_in ?? 5184000;

  let displayPhone = params.session.displayPhoneNumber ?? "";
  let businessName = params.session.businessName;
  let qualityRating: string | undefined;

  const phones = await getWabaPhoneNumbers(params.session.wabaId, accessToken);
  const matchedPhone =
    phones.data?.data?.find((p) => p.id === params.session.phoneNumberId) ??
    phones.data?.data?.[0];

  if (matchedPhone) {
    displayPhone = matchedPhone.display_phone_number;
    businessName = businessName ?? matchedPhone.verified_name;
    qualityRating = matchedPhone.quality_rating;
  }

  if (!displayPhone) {
    return { success: false, error: "Could not resolve WhatsApp phone number from Meta" };
  }

  const subscribe = await subscribeWabaToApp(params.session.wabaId, accessToken);

  const service = await createServiceClient();
  const stored = await storeWhatsAppConnection(service, {
    clinicId: params.clinicId,
    wabaId: params.session.wabaId,
    phoneNumberId: params.session.phoneNumberId,
    displayPhoneNumber: displayPhone,
    businessName,
    accessToken,
    expiresInSeconds: expiresIn,
    connectedBy: params.profileId,
    metaBusinessId: params.session.metaBusinessId,
    webhookSubscribed: subscribe.success,
    qualityRating,
    metadata: { embedded_signup: true },
  });

  if (stored.error) return { success: false, error: stored.error };
  return { success: true, connectionId: stored.connectionId };
}

async function completeSimulatedSignup(params: {
  clinicId: string;
  profileId?: string;
  session: EmbeddedSignupSession;
}): Promise<{ success: boolean; error?: string; connectionId?: string }> {
  if (process.env.NODE_ENV === "production") {
    return { success: false, error: "Meta WhatsApp is not configured for this environment" };
  }

  const service = await createServiceClient();
  const stored = await storeWhatsAppConnection(service, {
    clinicId: params.clinicId,
    wabaId: params.session.wabaId || `sim_waba_${params.clinicId.slice(0, 8)}`,
    phoneNumberId: params.session.phoneNumberId || `sim_phone_${params.clinicId.slice(0, 8)}`,
    displayPhoneNumber: params.session.displayPhoneNumber ?? "+91 98765 43210",
    businessName: params.session.businessName ?? "Demo Clinic WhatsApp",
    accessToken: "simulated-token",
    connectedBy: params.profileId,
    webhookSubscribed: false,
    metadata: { simulated: true },
  });

  if (stored.error) return { success: false, error: stored.error };
  return { success: true, connectionId: stored.connectionId };
}
