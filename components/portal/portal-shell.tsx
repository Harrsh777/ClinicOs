import type { PublicClinic } from "@/lib/portal/clinic-public";
import Link from "next/link";
import { Activity } from "lucide-react";

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
      className="min-h-screen bg-[var(--surface-1)]"
      style={
        {
          "--brand-500": primary,
          "--brand-600": primary,
          "--brand-700": primary,
          "--brand-50": `${primary}15`,
          "--brand-100": `${primary}25`,
          "--brand-200": `${primary}40`,
          "--accent-500": secondary,
          "--accent-600": secondary,
        } as React.CSSProperties
      }
    >
      <header className="border-b border-[var(--border)] bg-[var(--surface-0)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href={`/c/${clinic.slug}`} className="flex items-center gap-3 min-w-0">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={clinic.name} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
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
          {!whiteLabel && (
            <span className="hidden text-xs text-[var(--text-muted)] sm:inline">Powered by ClinicOS</span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
