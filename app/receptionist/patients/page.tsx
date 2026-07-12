import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getPatients } from "@/lib/actions/patients";
import { PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatientSearch } from "@/components/patients/patient-search";
import { PatientListTable } from "@/components/patients/patient-list-table";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireRole(["receptionist"]);
  const { q } = await searchParams;
  const patients = await getPatients(profile.clinic_id!, q);

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} patient${patients.length !== 1 ? "s" : ""} at your clinic`}
        action={
          <Link href="/receptionist/patients/new">
            <Button>Register Patient</Button>
          </Link>
        }
      />
      <PatientSearch defaultValue={q} />
      <div className="mt-4">
        <PatientListTable
          patients={patients}
          basePath="/receptionist/patients"
          canRegister
          registerHref="/receptionist/patients/new"
        />
      </div>
    </div>
  );
}
