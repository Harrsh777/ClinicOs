const META_GRAPH_VERSION = "v21.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface MetaPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
}

export interface MetaApiError {
  message: string;
  code?: number;
}

async function metaFetch<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {}
): Promise<{ data?: T; error?: MetaApiError }> {
  const { accessToken, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    const res = await fetch(`${META_GRAPH_BASE}${path}`, { ...init, headers });
    const data = (await res.json()) as T & { error?: MetaApiError };
    if (!res.ok) {
      return { error: data.error ?? { message: `Meta API error (${res.status})` } };
    }
    return { data };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : "Meta API request failed" } };
  }
}

export function isMetaConfigured(): boolean {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export async function exchangeCodeForToken(code: string): Promise<{ data?: MetaTokenResponse; error?: string }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return { error: "Meta app credentials not configured" };

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code,
  });

  const res = await fetch(`${META_GRAPH_BASE}/oauth/access_token?${params}`);
  const data = (await res.json()) as MetaTokenResponse & { error?: MetaApiError };
  if (!res.ok) return { error: data.error?.message ?? "Token exchange failed" };
  return { data };
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<{ data?: MetaTokenResponse; error?: string }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return { error: "Meta app credentials not configured" };

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(`${META_GRAPH_BASE}/oauth/access_token?${params}`);
  const data = (await res.json()) as MetaTokenResponse & { error?: MetaApiError };
  if (!res.ok) return { error: data.error?.message ?? "Long-lived token exchange failed" };
  return { data };
}

export async function getWabaPhoneNumbers(
  wabaId: string,
  accessToken: string
): Promise<{ data?: { data: MetaPhoneNumber[] }; error?: string }> {
  const result = await metaFetch<{ data: MetaPhoneNumber[] }>(
    `/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
    { accessToken }
  );
  if (result.error) return { error: result.error.message };
  return { data: result.data };
}

export async function subscribeWabaToApp(
  wabaId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  const result = await metaFetch<{ success: boolean }>(`/${wabaId}/subscribed_apps`, {
    method: "POST",
    accessToken,
  });
  if (result.error) return { success: false, error: result.error.message };
  return { success: result.data?.success ?? true };
}

export async function sendWhatsAppTextMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  toPhone: string;
  content: string;
}): Promise<{ externalId?: string; error?: string }> {
  const result = await metaFetch<{ messages: { id: string }[] }>(
    `/${params.phoneNumberId}/messages`,
    {
      method: "POST",
      accessToken: params.accessToken,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.toPhone,
        type: "text",
        text: { body: params.content },
      }),
    }
  );

  if (result.error) return { error: result.error.message };
  return { externalId: result.data?.messages?.[0]?.id };
}

export async function getBusinessProfile(
  phoneNumberId: string,
  accessToken: string
): Promise<{ businessName?: string; error?: string }> {
  const result = await metaFetch<{ verified_name?: string }>(
    `/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
    { accessToken }
  );
  if (result.error) return { error: result.error.message };
  return { businessName: result.data?.verified_name };
}
