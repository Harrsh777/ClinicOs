import { notFound } from "next/navigation";
import { BookingWizard } from "@/components/portal/booking-wizard";
import { getPublicClinicBySlug, getPublicDoctors } from "@/lib/portal/clinic-public";

export default async function PortalBookPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) notFound();

  const doctors = await getPublicDoctors(clinic.id);
  if (doctors.length === 0) {
    return (
      <div className="clinic-card p-6 text-center text-[var(--text-muted)]">
        Online booking is not available — no doctors accepting appointments.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Book an Appointment</h1>
      <BookingWizard clinic={clinic} doctors={doctors} defaultFee={clinic.consultation_fee_default} />
    </div>
  );
}
