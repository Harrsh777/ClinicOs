import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getClinicPrescriptions, type PrescriptionStatus } from "@/lib/actions/prescriptions";
import { getDoctors } from "@/lib/actions/appointments";
import { PageHeader } from "@/components/ui/card";
import { PrescriptionsStats } from "@/components/prescriptions/prescriptions-stats";
import { PrescriptionsFilters } from "@/components/prescriptions/prescriptions-filters";
import { PrescriptionListTable } from "@/components/prescriptions/prescription-list-table";
import { Button } from "@/components/ui/button";
import { Stethoscope, Users } from "lucide-react";

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
  };
}

export default async function OwnerPrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    doctor?: string;
    status?: string;
    patient?: string;
  }>;
}) {
  const profile = await requireRole(["clinic_owner"]);
  const params = await searchParams;
  const defaults = defaultDateRange();
  const from = params.from ?? defaults.from;
  const to = params.to ?? defaults.to;
  const doctorId = params.doctor;
  const status = params.status as PrescriptionStatus | undefined;
  const patientId = params.patient;

  const [prescriptions, doctors] = await Promise.all([
    getClinicPrescriptions(profile.clinic_id!, {
      dateFrom: from,
      dateTo: to,
      doctorId,
      patientId,
      status,
    }),
    getDoctors(profile.clinic_id!),
  ]);

  return (
    <div className="space-y-2">
      <PageHeader
        title="Prescriptions"
        subtitle="E-prescriptions issued at your clinic — history, sharing, and pharmacy coordination"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/owner/consultations">
              <Button variant="secondary" className="gap-2">
                <Stethoscope className="h-4 w-4" />
                Consultations
              </Button>
            </Link>
            <Link href="/owner/patients">
              <Button variant="ghost" className="gap-2">
                <Users className="h-4 w-4" />
                Patients
              </Button>
            </Link>
          </div>
        }
      />

      <PrescriptionsStats prescriptions={prescriptions} />

      <PrescriptionsFilters
        from={from}
        to={to}
        doctorId={doctorId}
        status={status}
        doctors={doctors}
        basePath="/owner/prescriptions"
      />

      <PrescriptionListTable prescriptions={prescriptions} />
    </div>
  );
}
