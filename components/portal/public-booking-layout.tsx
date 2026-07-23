import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Shield,
  Stethoscope,
  ChevronRight,
  Video,
  Zap,
} from "lucide-react";
import type { PublicClinic } from "@/lib/portal/clinic-public";
import type { PublicDoctor } from "@/components/portal/public-booking-showcase";
import { getPublicLoginPath } from "@/lib/portal/public-urls";

function doctorProfile(d: PublicDoctor) {
  const p = d.profiles;
  return Array.isArray(p) ? p[0] : p;
}

function todayHours(clinic: PublicClinic) {
  const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
  return clinic.opening_hours[dayKey];
}

const THEME_STYLES = {
  clinical_teal: {
    heroBg: "bg-gradient-to-r from-teal-50 via-slate-50 to-teal-100 border-teal-200",
    badgeBg: "bg-teal-100 text-teal-800 border-teal-200",
    btnBg: "bg-teal-600 hover:bg-teal-700 text-white",
    icon: "🩺",
  },
  kids_pediatric: {
    heroBg: "bg-gradient-to-r from-sky-100 via-amber-50 to-pink-50 border-sky-200",
    badgeBg: "bg-sky-100 text-sky-800 border-sky-300 font-bold",
    btnBg: "bg-sky-600 hover:bg-sky-700 text-white",
    icon: "🧸",
  },
  dental_care: {
    heroBg: "bg-gradient-to-r from-cyan-100 via-sky-50 to-slate-50 border-cyan-200",
    badgeBg: "bg-cyan-100 text-cyan-800 border-cyan-300 font-bold",
    btnBg: "bg-cyan-700 hover:bg-cyan-800 text-white",
    icon: "🦷",
  },
  dermatology_rose: {
    heroBg: "bg-gradient-to-r from-rose-100 via-pink-50 to-orange-50 border-rose-200",
    badgeBg: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
    btnBg: "bg-rose-600 hover:bg-rose-700 text-white",
    icon: "🌸",
  },
  emergency_slate: {
    heroBg: "bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 border-slate-700 text-white",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold",
    btnBg: "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold",
    icon: "⚡",
  },
  holistic_sage: {
    heroBg: "bg-gradient-to-r from-emerald-100 via-teal-50 to-amber-50 border-emerald-200",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
    btnBg: "bg-emerald-700 hover:bg-emerald-800 text-white",
    icon: "🌿",
  },
};

export function PublicBookingHero({ clinic, doctorCount }: { clinic: PublicClinic; doctorCount: number }) {
  const logo = clinic.branding?.logo_url ?? clinic.logo_url;
  const coverPhoto = clinic.branding?.cover_image_url;
  const hours = todayHours(clinic);
  const themeKey = clinic.branding?.theme_preset ?? "clinical_teal";
  const theme = THEME_STYLES[themeKey] ?? THEME_STYLES.clinical_teal;
  const badgeText = clinic.branding?.specialization_badge ?? "Specialized Medical Care";
  const bio = clinic.branding?.bio_description;

  return (
    <section className={`relative overflow-hidden rounded-2xl border ${theme.heroBg} shadow-sm`}>
      {/* Cover Banner Image if provided */}
      {coverPhoto && (
        <div className="relative h-44 w-full overflow-hidden">
          <img src={coverPhoto} alt="Clinic Banner" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {logo ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm">
                <Image src={logo} alt={clinic.name} fill className="object-contain p-2" unoptimized />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-2xl font-bold text-white shadow-sm">
                {clinic.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${theme.badgeBg}`}>
                  {theme.icon} {badgeText}
                </span>
                {clinic.branding?.teleconsult_enabled && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-bold text-blue-700">
                    <Video className="h-3 w-3" /> Teleconsult Available
                  </span>
                )}
                {clinic.branding?.emergency_enabled && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
                    <Zap className="h-3 w-3" /> Urgent Care Active
                  </span>
                )}
              </div>

              <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                {clinic.name}
              </h1>

              {bio ? (
                <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">{bio}</p>
              ) : clinic.branding?.tagline ? (
                <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">{clinic.branding.tagline}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm ring-1 ring-[var(--border)]">
                  <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                  {doctorCount} doctor{doctorCount !== 1 ? "s" : ""} available
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm ring-1 ring-[var(--border)]">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  From ₹{clinic.fees.normal}
                </span>
                {hours && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm ring-1 ring-[var(--border)]">
                    <Clock className="h-3.5 w-3.5 text-teal-600" />
                    Today {hours.open}–{hours.close}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href={getPublicLoginPath(clinic.slug, { mode: "register" })}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition ${theme.btnBg}`}
            >
              Create Patient Account
              <ChevronRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-[var(--text-muted)] sm:text-right">
              Track appointments, prescriptions & queue status
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BookingClinicPanel({
  clinic,
  doctors,
}: {
  clinic: PublicClinic;
  doctors: PublicDoctor[];
  schedules?: { doctor_id: string; day_of_week: number; start_time: string; end_time: string }[];
}) {
  const hours = todayHours(clinic);
  const address = [clinic.address, clinic.city, clinic.state].filter(Boolean).join(", ");

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Clinic details
        </h3>
        <div className="mt-4 space-y-3 text-sm">
          {address && (
            <p className="flex gap-2.5 text-[var(--text-secondary)]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
              {address}
            </p>
          )}
          {clinic.phone && (
            <p className="flex gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-teal-600" />
              <a href={`tel:${clinic.phone}`} className="text-teal-600 hover:underline font-medium">
                {clinic.phone}
              </a>
            </p>
          )}
          <p className="flex gap-2.5">
            <Clock className="h-4 w-4 shrink-0 text-teal-600" />
            {hours ? `Open today ${hours.open} – ${hours.close}` : "Closed today"}
          </p>
          <p className="flex gap-2.5">
            <Shield className="h-4 w-4 shrink-0 text-teal-600" />
            Secure booking · Instant confirmation
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Our doctors</h3>
        <ul className="mt-3 space-y-3">
          {doctors.slice(0, 4).map((d) => {
            const profile = doctorProfile(d);
            const name = profile?.full_name ?? "Doctor";
            const spec = d.specialization ?? profile?.specialization ?? "General";
            const fee = d.consultation_fee ?? clinic.fees.normal;
            return (
              <li key={d.id} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
                  {name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{spec}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-teal-700">₹{fee}</span>
              </li>
            );
          })}
        </ul>
        {doctors.length > 4 && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">+{doctors.length - 4} more doctors</p>
        )}
      </div>
    </aside>
  );
}
