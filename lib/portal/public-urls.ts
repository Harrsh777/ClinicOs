/** First URL segments that are app routes — never treated as clinic slugs. */
export const RESERVED_PORTAL_SLUGS = new Set([
  "admin",
  "owner",
  "doctor",
  "receptionist",
  "finance",
  "nurse",
  "pharmacist",
  "lab-tech",
  "hr",
  "administrator",
  "patient",
  "login",
  "signup",
  "register",
  "invite",
  "privacy",
  "terms",
  "pricing",
  "forgot-password",
  "activate",
  "reset-password",
  "check-in",
  "queue",
  "print",
  "c",
  "api",
  "_next",
]);

const SHORT_PORTAL_PAGES = new Set([
  "booking",
  "bookings",
  "walk-in",
  "check-in",
  "login",
  "account",
  "confirmation",
]);

/** Public booking path: /{clinicSlug}/booking */
export function getPublicBookingPath(clinicSlug: string) {
  return `/${clinicSlug}/booking`;
}

export function getPublicLoginPath(clinicSlug: string, opts?: { mode?: "register"; phone?: string }) {
  const params = new URLSearchParams();
  if (opts?.mode === "register") params.set("mode", "register");
  if (opts?.phone) params.set("phone", opts.phone);
  const qs = params.toString();
  return `/${clinicSlug}/login${qs ? `?${qs}` : ""}`;
}

export function getPublicAccountPath(clinicSlug: string, bookingId?: string) {
  const base = `/${clinicSlug}/account`;
  return bookingId ? `${base}?bookingId=${encodeURIComponent(bookingId)}` : base;
}

export function getPublicPortalPath(clinicSlug: string) {
  return `/${clinicSlug}`;
}

export function getPublicBookingUrl(clinicSlug: string, origin?: string) {
  const base = (origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${base}${getPublicBookingPath(clinicSlug)}`;
}

/**
 * Rewrites /{slug}/booking → /c/{slug}/bookings (and other short portal paths).
 * Returns null when the path is not a short clinic portal URL.
 */
export function resolveShortClinicPortalPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const [slug, page, ...rest] = segments;
  if (RESERVED_PORTAL_SLUGS.has(slug) || !SHORT_PORTAL_PAGES.has(page)) return null;

  const targetPage = page === "booking" ? "bookings" : page;
  const suffix = rest.length ? `/${rest.join("/")}` : "";
  return `/c/${slug}/${targetPage}${suffix}`;
}

export function isShortClinicPortalPath(pathname: string) {
  return resolveShortClinicPortalPath(pathname) !== null || resolveShortClinicLandingPath(pathname) !== null;
}

/** Rewrites /{slug} → /c/{slug} when slug is not a reserved app route. */
export function resolveShortClinicLandingPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const slug = segments[0];
  if (RESERVED_PORTAL_SLUGS.has(slug)) return null;
  return `/c/${slug}`;
}

export function resolveAnyShortClinicPath(pathname: string): string | null {
  return resolveShortClinicPortalPath(pathname) ?? resolveShortClinicLandingPath(pathname);
}
