import { notFound, redirect } from "next/navigation";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { getPortalSession } from "@/lib/portal/session";
import { PatientAuthForm } from "@/components/portal/patient-auth-form";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { getPublicBookingPath, getPublicLoginPath } from "@/lib/portal/public-urls";

export default async function PatientAccountSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinicSlug: string }>;
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { clinicSlug } = await params;
  const { bookingId } = await searchParams;
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) notFound();

  const session = await getPortalSession();
  if (!session || session.clinicId !== clinic.id) {
    const loginPath = getPublicLoginPath(clinicSlug, { mode: "register" });
    const redirectParam = bookingId
      ? `&redirect=${encodeURIComponent(`/${clinicSlug}/account?bookingId=${bookingId}`)}`
      : "";
    redirect(`${loginPath}${redirectParam}`);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Almost there!</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Set your password to access appointments, prescriptions, and queue updates
        </p>
      </div>

      {bookingId && (
        <Alert variant="success" className="mb-4">
          Booking <strong>{bookingId}</strong> confirmed. Create your account to manage it anytime.
        </Alert>
      )}

      <Card className="!p-6 shadow-lg ring-1 ring-[var(--border)]">
        <PatientAuthForm
          clinic={clinic}
          initialMode="register"
          redirectTo="/patient"
          defaultPhone={session.phone}
          startAtCredentials
        />
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        <Link href={getPublicLoginPath(clinicSlug)} className="font-medium text-[var(--brand-600)] hover:underline">
          Already have an account? Sign in
        </Link>
        {" · "}
        <Link href={getPublicBookingPath(clinicSlug)} className="text-[var(--brand-600)] hover:underline">
          Book again
        </Link>
      </p>
    </div>
  );
}
