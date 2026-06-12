import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ROLE_ROUTES } from "@/lib/types/database";

const PUBLIC_ROUTES = ["/", "/login", "/invite", "/privacy", "/terms", "/pricing"];
const PUBLIC_PREFIXES = ["/check-in/", "/queue/", "/api/health", "/api/webhooks/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/api/cron/");

  const { supabase, user, supabaseResponse } = await updateSession(request);

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
      .single();

    if (profile?.is_active) {
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
      .single();

    if (!profile?.is_active) {
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
