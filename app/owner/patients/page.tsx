import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getPatients } from "@/lib/actions/patients";
import { PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatientSearch } from "@/components/patients/patient-search";
import { PatientListTable } from "@/components/patients/patient-list-table";

export default async function OwnerPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireRole(["clinic_owner"]);
  const { q } = await searchParams;
  const patients = await getPatients(profile.clinic_id!, q);

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} patient${patients.length !== 1 ? "s" : ""} registered at your clinic`}
        action={
          <Link href="/owner/patients/new">
            <Button>Register Patient</Button>
          </Link>
        }
      />
      <PatientSearch defaultValue={q} basePath="/owner/patients" />
      <div className="mt-4">
        <PatientListTable
          patients={patients}
          basePath="/owner/patients"
          canRegister
          registerHref="/owner/patients/new"
        />
      </div>
    </div>
  );
}
