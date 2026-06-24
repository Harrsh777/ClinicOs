import { notFound, redirect } from "next/navigation";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { getPortalSession } from "@/lib/portal/session";
import { PatientAuthForm } from "@/components/portal/patient-auth-form";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    redirect(`/c/${clinicSlug}/login?mode=register${bookingId ? `&redirect=/c/${clinicSlug}/account?bookingId=${bookingId}` : ""}`);
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Your Account</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Track appointments, prescriptions, lab results, and live queue status
        </p>
      </div>

      {bookingId && (
        <Alert variant="success" className="mb-4">
          Your booking <strong>{bookingId}</strong> is confirmed. Create an account to manage it anytime.
        </Alert>
      )}

      <Card padding className="!p-6">
        <PatientAuthForm clinic={clinic} initialMode="register" redirectTo="/patient" />
      </Card>

      <div className="mt-4 text-center">
        <Link href="/patient">
          <Button variant="ghost">Already have an account? Sign in</Button>
        </Link>
      </div>
    </div>
  );
}
