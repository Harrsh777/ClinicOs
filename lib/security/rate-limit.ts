import { createServiceClient } from "@/lib/supabase/server";

interface RateLimitConfig {
  key: string;
  maxHits: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/** DB-backed rate limiter suitable for serverless deployments */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const service = await createServiceClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

  const { data: bucket } = await service
    .from("rate_limit_buckets")
    .select("*")
    .eq("bucket_key", config.key)
    .maybeSingle();

  if (!bucket || new Date(bucket.window_start) < windowStart) {
    await service.from("rate_limit_buckets").upsert({
      bucket_key: config.key,
      hit_count: 1,
      window_start: now.toISOString(),
      expires_at: new Date(now.getTime() + config.windowSeconds * 2 * 1000).toISOString(),
    });
    return { allowed: true, remaining: config.maxHits - 1 };
  }

  if (bucket.hit_count >= config.maxHits) {
    const retryAfter = Math.ceil(
      (new Date(bucket.window_start).getTime() + config.windowSeconds * 1000 - now.getTime()) / 1000
    );
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(retryAfter, 1) };
  }

  await service
    .from("rate_limit_buckets")
    .update({ hit_count: bucket.hit_count + 1 })
    .eq("bucket_key", config.key);

  return { allowed: true, remaining: config.maxHits - bucket.hit_count - 1 };
}

export function rateLimitKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

export async function enforceRateLimit(
  prefix: string,
  identifier: string,
  maxHits: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  return checkRateLimit({
    key: rateLimitKey(prefix, identifier),
    maxHits,
    windowSeconds,
  });
}
