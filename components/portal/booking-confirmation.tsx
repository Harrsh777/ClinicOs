import Link from "next/link";
import { getPublicAccountPath } from "@/lib/portal/public-urls";
import { VisitTokenCard } from "@/components/patient/visit-token-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListOrdered, Users, Clock } from "lucide-react";

interface ConfirmationProps {
  clinicSlug: string;
  booking: {
    booking_id: string;
    token_label: string | null;
    payment_status: string;
    check_in_status: string;
    visit_code: string;
    qr_signature: string;
    visit_type?: string;
    queuePosition?: number | null;
    waitingCount?: number | null;
    appointments?: {
      appointment_date: string;
      appointment_time: string;
      type?: string;
      doctors?: { profiles?: { full_name: string } | { full_name: string }[] };
    } | null;
  };
}

export function BookingConfirmation({ clinicSlug, booking }: ConfirmationProps) {
  const apt = booking.appointments;
  const doctorProfile = apt?.doctors?.profiles;
  const doctorName = Array.isArray(doctorProfile)
    ? doctorProfile[0]?.full_name
    : doctorProfile?.full_name;

  const isWalkIn = booking.visit_type === "walk_in" || apt?.type === "walk_in";
  const isInQueue = booking.check_in_status === "in_queue" && booking.token_label;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--success-700)]">
          {isWalkIn ? "You're in the queue!" : "Booking Confirmed!"}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Booking ID: {booking.booking_id}</p>
        {(booking as { receipt_number?: string }).receipt_number && (
          <p className="text-sm text-[var(--text-muted)]">Receipt: {(booking as { receipt_number?: string }).receipt_number}</p>
        )}
        {apt && (apt as { appointment_number?: string }).appointment_number && (
          <p className="text-sm text-[var(--text-muted)]">Appointment: {(apt as { appointment_number?: string }).appointment_number}</p>
        )}
      </div>

      {isInQueue ? (
        <>
          <div className="text-center">
            <p className="text-sm text-[var(--text-muted)]">Your queue token</p>
            <p className="clinic-token-display text-5xl mt-2">{booking.token_label}</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              {isWalkIn
                ? "Please wait in the lobby. Reception and the TV display are updated live."
                : "You're in the live queue — reception can see you now."}
            </p>
          </div>

          {(booking.queuePosition != null || booking.waitingCount != null) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {booking.queuePosition != null && (
                <Card className="flex items-center gap-3 !p-4">
                  <Users className="h-5 w-5 text-[var(--brand-500)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Your position</p>
                    <p className="font-semibold">#{booking.queuePosition} in queue</p>
                  </div>
                </Card>
              )}
              {booking.waitingCount != null && (
                <Card className="flex items-center gap-3 !p-4">
                  <Clock className="h-5 w-5 text-[var(--brand-500)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Patients waiting</p>
                    <p className="font-semibold">{booking.waitingCount} total</p>
                  </div>
                </Card>
              )}
            </div>
          )}

          <VisitTokenCard visit={booking} />
        </>
      ) : (
        <Card className="text-center">
          <p className="font-medium">Appointment scheduled</p>
          {apt && (
            <p className="text-sm text-[var(--text-muted)] mt-2">
              {apt.appointment_date} at {apt.appointment_time?.slice(0, 5)}
              {doctorName ? ` with ${doctorName}` : ""}
            </p>
          )}
          <p className="text-sm text-[var(--text-muted)] mt-4">
            Your token will be assigned when you arrive on the appointment day.
            Show your booking ID at reception or scan the QR below.
          </p>
          <VisitTokenCard visit={booking} />
        </Card>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <Link href={getPublicAccountPath(clinicSlug, booking.booking_id)}>
          <Button className="gap-2">Create Account to Track Visit</Button>
        </Link>
        <Link href={`/c/${clinicSlug}/login`}>
          <Button variant="secondary">Patient Sign In</Button>
        </Link>
        <Link href={`/queue/${clinicSlug}/display`} target="_blank">
          <Button variant="secondary" className="gap-2">
            <ListOrdered className="h-4 w-4" />
            View Live Queue
          </Button>
        </Link>
        {isWalkIn && (
          <Link href={`/c/${clinicSlug}/walk-in`}>
            <Button variant="ghost">Walk-in again</Button>
          </Link>
        )}
        <Link href={`/c/${clinicSlug}`}>
          <Button variant="ghost">Back to Clinic</Button>
        </Link>
      </div>
    </div>
  );
}
