import { notFound } from "next/navigation";
import { BookingConfirmation } from "@/components/portal/booking-confirmation";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { getPortalBookingStatus } from "@/lib/actions/public-portal";

export default async function PortalConfirmationPage({
  params,
}: {
  params: Promise<{ clinicSlug: string; bookingId: string }>;
}) {
  const { clinicSlug, bookingId } = await params;
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) notFound();

  const booking = await getPortalBookingStatus(bookingId, clinicSlug);
  if (!booking) {
    return (
      <div className="clinic-card p-6 text-center">
        <p className="text-[var(--text-muted)]">Booking not found.</p>
      </div>
    );
  }

  const isPayAtClinic = booking.payment_status === "pending";
  if (!isPayAtClinic && booking.payment_status !== "paid") {
    return (
      <div className="clinic-card p-6 text-center">
        <p className="text-[var(--text-muted)]">Payment pending. Complete payment to view confirmation.</p>
      </div>
    );
  }

  return (
    <BookingConfirmation
      clinicSlug={clinicSlug}
      booking={booking as unknown as Parameters<typeof BookingConfirmation>[0]["booking"]}
    />
  );
}
