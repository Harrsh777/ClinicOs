import type { PublicClinic } from "@/lib/portal/clinic-public";
import Link from "next/link";
import { Activity, Calendar, UserPlus } from "lucide-react";
import { getPublicBookingPath, getPublicLoginPath, getPublicPortalPath } from "@/lib/portal/public-urls";

export function PortalShell({
  clinic,
  children,
}: {
  clinic: PublicClinic;
  children: React.ReactNode;
}) {
  const primary = clinic.branding?.primary_color ?? "#0ea5e9";
  const secondary = clinic.branding?.secondary_color ?? "#14b8a6";
  const logo = clinic.branding?.logo_url ?? clinic.logo_url;
  const whiteLabel = clinic.branding?.white_label ?? false;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[var(--surface-1)] to-[var(--surface-2)]"
      style={
        {
          "--brand-500": primary,
          "--brand-600": primary,
          "--brand-700": primary,
          "--brand-50": `${primary}12`,
          "--brand-100": `${primary}22`,
          "--brand-200": `${primary}35`,
          "--brand-800": primary,
          "--accent-500": secondary,
          "--accent-600": secondary,
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-50 border-b border-[var(--border)]/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <Link href={getPublicPortalPath(clinic.slug)} className="flex min-w-0 items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={clinic.name} className="h-10 w-10 rounded-xl object-cover ring-1 ring-[var(--border)]" />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
              >
                <Activity className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--text-primary)]">{clinic.name}</p>
              {clinic.branding?.tagline && (
                <p className="truncate text-xs text-[var(--text-muted)]">{clinic.branding.tagline}</p>
              )}
            </div>
          </Link>

          <nav className="flex shrink-0 items-center gap-2">
            <Link
              href={getPublicBookingPath(clinic.slug)}
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)] sm:inline-flex"
            >
              <Calendar className="h-4 w-4" />
              Book
            </Link>
            <Link
              href={getPublicLoginPath(clinic.slug)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)]"
            >
              Sign In
            </Link>
            <Link
              href={getPublicLoginPath(clinic.slug, { mode: "register" })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-500)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Account</span>
              <span className="sm:hidden">Join</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">{children}</main>
      {!whiteLabel && (
        <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--text-muted)]">
          Powered by ClinicOS · Secure healthcare booking
        </footer>
      )}
    </div>
  );
}
