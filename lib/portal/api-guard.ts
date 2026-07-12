import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getIdempotentResponse, storeIdempotentResponse } from "@/lib/security/idempotency";

export async function guardPortalRequest(
  request: NextRequest,
  opts: {
    scope: string;
    rateKey: string;
    maxHits?: number;
    windowSeconds?: number;
  }
): Promise<NextResponse | null> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rl = await enforceRateLimit(
    opts.scope,
    `${opts.rateKey}:${ip}`,
    opts.maxHits ?? 30,
    opts.windowSeconds ?? 60
  );

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds ?? 60) },
      }
    );
  }

  return null;
}

export async function checkIdempotency<T extends Record<string, unknown>>(
  request: NextRequest,
  scope: string,
  clinicId?: string
): Promise<{ hit: true; response: NextResponse } | { hit: false; key: string | null }> {
  const key = request.headers.get("idempotency-key")?.trim() ?? null;
  if (!key) return { hit: false, key: null };

  const cached = await getIdempotentResponse<T>({ key, scope, clinicId });
  if (cached.hit) {
    return { hit: true, response: NextResponse.json(cached.body, { status: cached.statusCode }) };
  }
  return { hit: false, key };
}

export async function saveIdempotentResponse(
  key: string | null,
  scope: string,
  body: Record<string, unknown>,
  statusCode: number,
  clinicId?: string
) {
  if (!key) return;
  await storeIdempotentResponse({ key, scope, clinicId }, body, statusCode);
}
