import { notFound } from "next/navigation";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { PatientAuthForm } from "@/components/portal/patient-auth-form";
import { Card } from "@/components/ui/card";

export default async function PatientPortalLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinicSlug: string }>;
  searchParams: Promise<{ mode?: string; redirect?: string }>;
}) {
  const { clinicSlug } = await params;
  const { mode, redirect } = await searchParams;
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) notFound();

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Patient Portal</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Sign in to {clinic.name} to view records, appointments, and more
        </p>
      </div>
      <Card padding className="!p-6">
        <PatientAuthForm
          clinic={clinic}
          initialMode={mode === "register" ? "register" : "login"}
          redirectTo={redirect}
        />
      </Card>
    </div>
  );
}
