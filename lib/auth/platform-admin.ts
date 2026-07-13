export {
  PLATFORM_ADMIN_COOKIE,
  PLATFORM_ADMIN_SESSION_MAX_AGE_MS,
  PLATFORM_ADMIN_SESSION_SECRET,
  platformAdminCookieOptions,
} from "@/lib/auth/platform-admin.constants";

export {
  createPlatformAdminSessionToken,
  verifyPlatformAdminSession,
} from "@/lib/auth/platform-admin-session";

export { verifyPlatformAdminPassword } from "@/lib/auth/platform-admin-password";
