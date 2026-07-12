import { notFound } from "next/navigation";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { PatientAuthForm } from "@/components/portal/patient-auth-form";
import { Card } from "@/components/ui/card";
import { UserPlus, LogIn } from "lucide-react";
import Link from "next/link";
import { getPublicBookingPath } from "@/lib/portal/public-urls";

export default async function PatientPortalLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinicSlug: string }>;
  searchParams: Promise<{ mode?: string; redirect?: string; phone?: string }>;
}) {
  const { clinicSlug } = await params;
  const { mode, redirect, phone } = await searchParams;
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) notFound();

  const isRegister = mode === "register";

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-50)]">
          {isRegister ? (
            <UserPlus className="h-7 w-7 text-[var(--brand-600)]" />
          ) : (
            <LogIn className="h-7 w-7 text-[var(--brand-600)]" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {isRegister
            ? `Join ${clinic.name} to track appointments, prescriptions, and your health records`
            : `Sign in to your ${clinic.name} patient portal`}
        </p>
      </div>

      <Card className="!overflow-hidden !p-0 shadow-lg ring-1 ring-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--surface-1)] px-6 py-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">{clinic.name}</p>
          <p className="text-xs text-[var(--text-muted)]">Patient portal · secure access</p>
        </div>
        <div className="p-6">
          <PatientAuthForm
            clinic={clinic}
            initialMode={isRegister ? "register" : "login"}
            redirectTo={redirect}
            defaultPhone={phone ?? ""}
          />
        </div>
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Need an appointment?{" "}
        <Link href={getPublicBookingPath(clinic.slug)} className="font-medium text-[var(--brand-600)] hover:underline">
          Book online
        </Link>
      </p>
    </div>
  );
}
