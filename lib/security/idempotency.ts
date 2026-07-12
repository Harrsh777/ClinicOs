import { createServiceClient } from "@/lib/supabase/server";

interface IdempotencyCheck {
  key: string;
  scope: string;
  clinicId?: string;
}

export async function getIdempotentResponse<T = Record<string, unknown>>(
  check: IdempotencyCheck
): Promise<{ hit: true; body: T; statusCode: number } | { hit: false }> {
  const service = await createServiceClient();
  const { data } = await service
    .from("idempotency_keys")
    .select("response_body, status_code")
    .eq("idempotency_key", check.key)
    .eq("scope", check.scope)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (data?.response_body) {
    return { hit: true, body: data.response_body as T, statusCode: data.status_code };
  }
  return { hit: false };
}

export async function storeIdempotentResponse(
  check: IdempotencyCheck,
  body: Record<string, unknown>,
  statusCode = 200
) {
  const service = await createServiceClient();
  await service.from("idempotency_keys").upsert(
    {
      idempotency_key: check.key,
      scope: check.scope,
      clinic_id: check.clinicId ?? null,
      response_body: body,
      status_code: statusCode,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "idempotency_key,scope" }
  );
}

export async function isWebhookProcessed(provider: string, eventId: string): Promise<boolean> {
  const service = await createServiceClient();
  const { data } = await service
    .from("processed_webhook_events")
    .select("id")
    .eq("provider", provider)
    .eq("event_id", eventId)
    .maybeSingle();
  return !!data;
}

export async function markWebhookProcessed(
  provider: string,
  eventId: string,
  eventType: string,
  payload?: Record<string, unknown>
) {
  const service = await createServiceClient();
  await service.from("processed_webhook_events").insert({
    provider,
    event_id: eventId,
    event_type: eventType,
    payload: payload ?? {},
  });
}
