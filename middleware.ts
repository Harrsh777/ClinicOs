import { type NextRequest, NextResponse } from "next/server";
import { isProfileSuspended } from "@/lib/auth/profile";
import {
  encodeMiddlewareProfile,
  MIDDLEWARE_PROFILE_HEADER,
  MIDDLEWARE_SETUP_HEADER,
} from "@/lib/auth/middleware-profile";
import { updateSession } from "@/lib/supabase/middleware";
import { ROLE_ROUTES, type Profile } from "@/lib/types/database";
import { getClinicFeatures, getFeatureRouteGuard, isFeatureEnabled } from "@/lib/clinic/features";
import { getClinicModules, getModuleKeyFromPath, isClinicModuleEnabled } from "@/lib/clinic/modules";
import { isShortClinicPortalPath, resolveAnyShortClinicPath } from "@/lib/portal/public-urls";
import { PLATFORM_ADMIN_COOKIE } from "@/lib/auth/platform-admin.constants";
import { verifyPlatformAdminSession } from "@/lib/auth/platform-admin-session";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/register", "/invite", "/privacy", "/terms", "/pricing", "/forgot-password"];
const PUBLIC_PREFIXES = ["/check-in/", "/queue/", "/c/", "/api/health", "/api/webhooks/", "/api/portal/", "/activate/", "/reset-password/"];

const PLATFORM_HOSTS = ["localhost", "127.0.0.1", "clinicos"];

const ROLE_PREFIXES = [
  "/admin",
  "/owner",
  "/doctor",
  "/receptionist",
  "/finance",
  "/nurse",
  "/pharmacist",
  "/lab-tech",
  "/hr",
  "/administrator",
  "/patient",
];

function isPlatformHost(host: string) {
  const bare = host.split(":")[0].toLowerCase();
  return PLATFORM_HOSTS.some((h) => bare === h || bare.endsWith(`.${h}`) || bare.includes("vercel.app"));
}

function resolveSubdomainSlug(host: string): string | null {
  const bare = host.split(":")[0].toLowerCase();
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN?.toLowerCase();

  if (platformDomain && bare.endsWith(`.${platformDomain}`)) {
    const sub = bare.slice(0, -(platformDomain.length + 1));
    if (sub && !["www", "app", "admin", "api"].includes(sub)) return sub;
  }

  if (bare.endsWith(".localhost")) {
    const sub = bare.replace(".localhost", "");
    if (sub && sub !== "localhost") return sub;
  }

  return null;
}

function attachProfileContext(
  request: NextRequest,
  supabaseResponse: NextResponse,
  context: Record<string, string>
) {
  const requestHeaders = new Headers(request.headers);
  for (const [key, value] of Object.entries(context)) {
    requestHeaders.set(key, value);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie.name, cookie.value, cookie);
  }

  return response;
}

function withPathname(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
  profileContext: Record<string, string> = {}
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  for (const [key, value] of Object.entries(profileContext)) {
    requestHeaders.set(key, value);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie.name, cookie.value, cookie);
  }

  return response;
}

async function hasPlatformAdminSession(request: NextRequest) {
  return verifyPlatformAdminSession(request.cookies.get(PLATFORM_ADMIN_COOKIE)?.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    isShortClinicPortalPath(pathname) ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/api/cron/");

  const { supabase, user, supabaseResponse } = await updateSession(request);

  if (pathname === "/admin/login") {
    if (await hasPlatformAdminSession(request)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return withPathname(request, supabaseResponse, pathname);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!(await hasPlatformAdminSession(request))) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return withPathname(request, supabaseResponse, pathname);
  }

  const subSlug = resolveSubdomainSlug(host);
  if (
    subSlug &&
    !pathname.startsWith("/c/") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next")
  ) {
    const target = pathname === "/" ? `/c/${subSlug}` : `/c/${subSlug}${pathname}`;
    return NextResponse.rewrite(new URL(target, request.url));
  }

  // localhost:3002/{clinicSlug}/booking → /c/{clinicSlug}/bookings (public, no login)
  const shortPortalTarget = resolveAnyShortClinicPath(pathname);
  if (
    shortPortalTarget &&
    isPlatformHost(host) &&
    !pathname.startsWith("/c/") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next")
  ) {
    return NextResponse.rewrite(new URL(shortPortalTarget, request.url));
  }

  if (!pathname.startsWith("/c/") && !pathname.startsWith("/api/") && !isPlatformHost(host)) {
    const domain = host.split(":")[0].toLowerCase();
    const { data: branding } = await supabase
      .from("clinic_branding")
      .select("clinics!inner(slug, status, portal_enabled)")
      .eq("custom_domain", domain)
      .maybeSingle();

    const clinic = branding?.clinics as unknown as { slug: string; status: string; portal_enabled?: boolean } | null;
    if (clinic?.status === "active" && clinic.portal_enabled !== false) {
      const slug = clinic.slug;
      const target = pathname === "/" ? `/c/${slug}` : `/c/${slug}${pathname}`;
      return NextResponse.rewrite(new URL(target, request.url));
    }
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (!user) {
    return supabaseResponse;
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileRow as Profile | null;
  const profileContext: Record<string, string> = profile
    ? { [MIDDLEWARE_PROFILE_HEADER]: encodeMiddlewareProfile(profile) }
    : {};

  if (pathname === "/login" || pathname === "/") {
    if (profile && profile.is_active !== false) {
      const route = ROLE_ROUTES[profile.role as keyof typeof ROLE_ROUTES] ?? "/patient";
      return NextResponse.redirect(new URL(route, request.url));
    }
    return attachProfileContext(request, supabaseResponse, profileContext);
  }

  const matchedPrefix = ROLE_PREFIXES.find((p) => pathname.startsWith(p));
  if (!matchedPrefix) {
    return Object.keys(profileContext).length > 0
      ? attachProfileContext(request, supabaseResponse, profileContext)
      : supabaseResponse;
  }

  if (!profile) {
    return NextResponse.redirect(new URL("/login?error=profile_missing", request.url));
  }

  if (isProfileSuspended(profile)) {
    return NextResponse.redirect(new URL("/login?error=account_suspended", request.url));
  }

  if (
    profile.role === "clinic_owner" &&
    pathname.startsWith("/owner")
  ) {
    const { data: clinic } = await supabase
      .from("clinics")
      .select("clinic_setup_completed")
      .eq("id", profile.clinic_id!)
      .maybeSingle();

    profileContext[MIDDLEWARE_SETUP_HEADER] = clinic?.clinic_setup_completed ? "1" : "0";

    if (profile.first_login && !pathname.startsWith("/owner/change-password")) {
      return NextResponse.redirect(new URL("/owner/change-password", request.url));
    }

    if (
      !pathname.startsWith("/owner/onboarding") &&
      !pathname.startsWith("/owner/change-password") &&
      clinic &&
      !clinic.clinic_setup_completed
    ) {
      return NextResponse.redirect(new URL("/owner/onboarding", request.url));
    }
  }

  const expectedPrefix = ROLE_ROUTES[profile.role as keyof typeof ROLE_ROUTES];
  if (expectedPrefix && !pathname.startsWith(expectedPrefix)) {
    return NextResponse.redirect(new URL(expectedPrefix, request.url));
  }

  if (profile.clinic_id && profile.role !== "super_admin") {
    const moduleKey = getModuleKeyFromPath(pathname);
    if (moduleKey) {
      const modules = await getClinicModules(profile.clinic_id);
      if (!isClinicModuleEnabled(modules, moduleKey)) {
        const roleBase = ROLE_ROUTES[profile.role as keyof typeof ROLE_ROUTES] ?? "/";
        return NextResponse.redirect(new URL(roleBase, request.url));
      }
    }

    const guard = getFeatureRouteGuard(pathname);
    if (guard) {
      const { features } = await getClinicFeatures(profile.clinic_id);
      if (!isFeatureEnabled(features, guard.feature)) {
        return NextResponse.redirect(new URL(guard.upgradePath, request.url));
      }
    }
  }

  return attachProfileContext(request, supabaseResponse, profileContext);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
