import { createHmac, scryptSync, timingSafeEqual } from "crypto";

export const PLATFORM_ADMIN_COOKIE = "clinicos_platform_admin";

/** scrypt hash of `clinicos@123` with salt `clinicos-platform-admin-v1` */
const PASSWORD_SALT = "clinicos-platform-admin-v1";
const PASSWORD_HASH_HEX = "05b93c8ca0d00bfb4ded9e62cc1a4b5ef29672a7f7f36edfaabedab1af24a2c3";

const SESSION_SECRET =
  process.env.PLATFORM_ADMIN_SESSION_SECRET ?? "clinicos-platform-session-v1-change-in-production";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function verifyPlatformAdminPassword(password: string): boolean {
  try {
    const hash = scryptSync(password, PASSWORD_SALT, 32);
    const expected = Buffer.from(PASSWORD_HASH_HEX, "hex");
    if (hash.length !== expected.length) return false;
    return timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}

export function createPlatformAdminSessionToken(): string {
  const exp = Date.now() + SESSION_MAX_AGE_MS;
  const sig = createHmac("sha256", SESSION_SECRET)
    .update(`platform-admin:${exp}`)
    .digest("hex");
  return `${exp}.${sig}`;
}

export function verifyPlatformAdminSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = createHmac("sha256", SESSION_SECRET)
    .update(`platform-admin:${exp}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export const platformAdminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_MS / 1000,
};
