export const PLATFORM_ADMIN_COOKIE = "clinicos_platform_admin";

export const PLATFORM_ADMIN_SESSION_SECRET =
  process.env.PLATFORM_ADMIN_SESSION_SECRET ?? "clinicos-platform-session-v1-change-in-production";

export const PLATFORM_ADMIN_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const platformAdminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: PLATFORM_ADMIN_SESSION_MAX_AGE_MS / 1000,
};
