import type { PublicClinic } from "@/lib/portal/clinic-public";
import Link from "next/link";
import { Activity, Calendar, UserPlus } from "lucide-react";
import { getPublicBookingPath, getPublicLoginPath, getPublicPortalPath } from "@/lib/portal/public-urls";

const THEME_PALETTES: Record<string, { primary: string; secondary: string; pageBg: string }> = {
  clinical_teal: { primary: "#0d9488", secondary: "#0284c7", pageBg: "bg-gradient-to-b from-teal-50/60 via-slate-50 to-teal-100/30" },
  kids_pediatric: { primary: "#0284c7", secondary: "#f59e0b", pageBg: "bg-gradient-to-b from-sky-50 via-amber-50/40 to-sky-100/40" },
  dental_care: { primary: "#0891b2", secondary: "#1e40af", pageBg: "bg-gradient-to-b from-cyan-50 via-blue-50/40 to-slate-100/50" },
  dermatology_rose: { primary: "#e11d48", secondary: "#d97706", pageBg: "bg-gradient-to-b from-rose-50 via-pink-50/40 to-amber-50/30" },
  emergency_slate: { primary: "#d97706", secondary: "#dc2626", pageBg: "bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-100" },
  holistic_sage: { primary: "#059669", secondary: "#d97706", pageBg: "bg-gradient-to-b from-emerald-50 via-teal-50/40 to-stone-100/50" },
};

export function PortalShell({
  clinic,
  children,
}: {
  clinic: PublicClinic;
  children: React.ReactNode;
}) {
  const presetKey = clinic.branding?.theme_preset ?? "clinical_teal";
  const palette = THEME_PALETTES[presetKey] ?? THEME_PALETTES.clinical_teal;
  const primary = clinic.branding?.primary_color || palette.primary;
  const secondary = clinic.branding?.secondary_color || palette.secondary;
  const logo = clinic.branding?.logo_url ?? clinic.logo_url;
  const whiteLabel = clinic.branding?.white_label ?? false;

  return (
    <div
      className={`min-h-screen ${palette.pageBg}`}
      style={
        {
          "--brand-500": primary,
          "--brand-600": primary,
          "--brand-700": primary,
          "--brand-50": `${primary}15`,
          "--brand-100": `${primary}25`,
          "--brand-200": `${primary}40`,
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
