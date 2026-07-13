import {
  PLATFORM_ADMIN_SESSION_MAX_AGE_MS,
  PLATFORM_ADMIN_SESSION_SECRET,
} from "@/lib/auth/platform-admin.constants";

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function createPlatformAdminSessionToken(): Promise<string> {
  const exp = Date.now() + PLATFORM_ADMIN_SESSION_MAX_AGE_MS;
  const sig = await hmacSha256Hex(PLATFORM_ADMIN_SESSION_SECRET, `platform-admin:${exp}`);
  return `${exp}.${sig}`;
}

export async function verifyPlatformAdminSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await hmacSha256Hex(PLATFORM_ADMIN_SESSION_SECRET, `platform-admin:${exp}`);
  return timingSafeEqualHex(sig, expected);
}
