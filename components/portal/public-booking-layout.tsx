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
} from "lucide-react";
import type { PublicClinic } from "@/lib/portal/clinic-public";
import type { PublicDoctor } from "@/components/portal/public-booking-showcase";
import { getPublicLoginPath } from "@/lib/portal/public-urls";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function doctorProfile(d: PublicDoctor) {
  const p = d.profiles;
  return Array.isArray(p) ? p[0] : p;
}

function todayHours(clinic: PublicClinic) {
  const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
  return clinic.opening_hours[dayKey];
}

export function PublicBookingHero({ clinic, doctorCount }: { clinic: PublicClinic; doctorCount: number }) {
  const logo = clinic.branding?.logo_url ?? clinic.logo_url;
  const hours = todayHours(clinic);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-0)]">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          background: `linear-gradient(135deg, var(--brand-500), var(--accent-500))`,
        }}
      />
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--brand-100)] opacity-40 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[var(--accent-500)] opacity-20 blur-3xl" />

      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {logo ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm">
                <Image src={logo} alt={clinic.name} fill className="object-contain p-2" unoptimized />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-500)] text-2xl font-bold text-white shadow-sm">
                {clinic.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-600)]">
                Online Booking
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                {clinic.name}
              </h1>
              {clinic.branding?.tagline && (
                <p className="mt-1 max-w-xl text-[var(--text-secondary)]">{clinic.branding.tagline}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm ring-1 ring-[var(--border)]">
                  <Stethoscope className="h-3.5 w-3.5 text-[var(--brand-500)]" />
                  {doctorCount} doctor{doctorCount !== 1 ? "s" : ""} available
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm ring-1 ring-[var(--border)]">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  From ₹{clinic.fees.normal}
                </span>
                {hours && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm ring-1 ring-[var(--border)]">
                    <Clock className="h-3.5 w-3.5 text-[var(--brand-500)]" />
                    Today {hours.open}–{hours.close}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href={getPublicLoginPath(clinic.slug, { mode: "register" })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-500)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
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
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-500)]" />
              {address}
            </p>
          )}
          {clinic.phone && (
            <p className="flex gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-[var(--brand-500)]" />
              <a href={`tel:${clinic.phone}`} className="text-[var(--brand-600)] hover:underline">
                {clinic.phone}
              </a>
            </p>
          )}
          <p className="flex gap-2.5">
            <Clock className="h-4 w-4 shrink-0 text-[var(--brand-500)]" />
            {hours ? `Open today ${hours.open} – ${hours.close}` : "Closed today"}
          </p>
          <p className="flex gap-2.5">
            <Shield className="h-4 w-4 shrink-0 text-[var(--brand-500)]" />
            Secure booking · No login required
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-50)] text-sm font-semibold text-[var(--brand-700)]">
                  {name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{spec}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-[var(--brand-600)]">₹{fee}</span>
              </li>
            );
          })}
        </ul>
        {doctors.length > 4 && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">+{doctors.length - 4} more doctors</p>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-[var(--brand-200)] bg-[var(--brand-50)] p-5">
        <p className="text-sm font-medium text-[var(--brand-800)]">Already a patient?</p>
        <p className="mt-1 text-xs text-[var(--brand-700)]">
          Create an account to view history, prescriptions, and live queue updates.
        </p>
        <Link
          href={getPublicLoginPath(clinic.slug, { mode: "register" })}
          className="mt-3 inline-flex text-sm font-semibold text-[var(--brand-600)] hover:underline"
        >
          Create free account →
        </Link>
      </div>
    </aside>
  );
}
