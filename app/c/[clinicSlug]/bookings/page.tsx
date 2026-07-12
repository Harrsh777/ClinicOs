import { notFound } from "next/navigation";
import { Phase2BookingWizard } from "@/components/portal/phase2-booking-wizard";
import {
  PublicBookingHero,
  BookingClinicPanel,
} from "@/components/portal/public-booking-layout";
import { getPublicClinicBySlug, getPublicDoctors, getPublicDoctorSchedules } from "@/lib/portal/clinic-public";

export default async function PortalBookingsPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) notFound();

  const [doctors, schedules] = await Promise.all([
    getPublicDoctors(clinic.id),
    getPublicDoctorSchedules(clinic.id),
  ]);

  if (doctors.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-[var(--text-primary)]">Booking unavailable</p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {clinic.name} is not accepting online appointments yet. Please call the clinic directly.
        </p>
        {clinic.phone && (
          <a
            href={`tel:${clinic.phone}`}
            className="mt-4 inline-block text-sm font-medium text-[var(--brand-600)] hover:underline"
          >
            Call {clinic.phone}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PublicBookingHero clinic={clinic} doctorCount={doctors.length} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <section id="book" className="scroll-mt-6 min-w-0">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Schedule your visit</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Pick a doctor, choose a time, and confirm — takes under 2 minutes
            </p>
          </div>
          <Phase2BookingWizard clinic={clinic} doctors={doctors} />
        </section>

        <BookingClinicPanel clinic={clinic} doctors={doctors} schedules={schedules} />
      </div>
    </div>
  );
}
