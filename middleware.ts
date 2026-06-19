import { type NextRequest, NextResponse } from "next/server";
import { isProfileSuspended } from "@/lib/auth/profile";
import { updateSession } from "@/lib/supabase/middleware";
import { ROLE_ROUTES } from "@/lib/types/database";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/invite", "/privacy", "/terms", "/pricing"];
const PUBLIC_PREFIXES = ["/check-in/", "/queue/", "/c/", "/api/health", "/api/webhooks/", "/api/portal/"];

const PLATFORM_HOSTS = ["localhost", "127.0.0.1", "clinicos"];

function isPlatformHost(host: string) {
  const bare = host.split(":")[0].toLowerCase();
  return PLATFORM_HOSTS.some((h) => bare === h || bare.endsWith(`.${h}`) || bare.includes("vercel.app"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/api/cron/");

  const { supabase, user, supabaseResponse } = await updateSession(request);

  // Custom domain → rewrite to /c/[slug]
  if (!pathname.startsWith("/c/") && !pathname.startsWith("/api/") && !isPlatformHost(host)) {
    const domain = host.split(":")[0].toLowerCase();
    const { data: branding } = await supabase
      .from("clinic_branding")
      .select("clinics!inner(slug, status)")
      .eq("custom_domain", domain)
      .maybeSingle();

    const clinic = branding?.clinics as unknown as { slug: string; status: string } | null;
    if (clinic?.status === "active") {
      const slug = clinic.slug;
      const target =
        pathname === "/" ? `/c/${slug}` : `/c/${slug}${pathname}`;
      return NextResponse.rewrite(new URL(target, request.url));
    }
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && profile.is_active !== false) {
      const route = ROLE_ROUTES[profile.role as keyof typeof ROLE_ROUTES] ?? "/patient";
      return NextResponse.redirect(new URL(route, request.url));
    }
  }

  const rolePrefixes = ["/admin", "/owner", "/doctor", "/receptionist", "/finance", "/patient"];
  const matchedPrefix = rolePrefixes.find((p) => pathname.startsWith(p));

  if (user && matchedPrefix) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/login?error=profile_missing", request.url));
    }

    if (isProfileSuspended(profile)) {
      return NextResponse.redirect(new URL("/login?error=account_suspended", request.url));
    }

    const expectedPrefix = ROLE_ROUTES[profile.role as keyof typeof ROLE_ROUTES];
    if (expectedPrefix && !pathname.startsWith(expectedPrefix)) {
      return NextResponse.redirect(new URL(expectedPrefix, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
