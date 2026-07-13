import { requireRole } from "@/lib/auth/session";
import { getLinkedDoctor } from "@/lib/auth/linked-doctor";
import { getPatientsWithDoctorNotes } from "@/lib/actions/patients";
import { PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatientSearch } from "@/components/patients/patient-search";
import { PatientListTable } from "@/components/patients/patient-list-table";
import Link from "next/link";

export default async function OwnerPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireRole(["clinic_owner"]);
  const { q } = await searchParams;
  const linkedDoctor = await getLinkedDoctor(profile.id);
  const patients = await getPatientsWithDoctorNotes(profile.clinic_id!, q);

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} patient${patients.length !== 1 ? "s" : ""} registered at your clinic`}
        action={
          <div className="flex flex-wrap gap-2">
            {linkedDoctor && (
              <Link href="/owner/my-queue">
                <Button variant="secondary">My Queue</Button>
              </Link>
            )}
            <Link href="/owner/patients/new">
              <Button>Register Patient</Button>
            </Link>
          </div>
        }
      />
      <PatientSearch defaultValue={q} basePath="/owner/patients" />
      <div className="mt-4">
        <PatientListTable
          patients={patients}
          basePath="/owner/patients"
          canRegister
          registerHref="/owner/patients/new"
          showDoctorNotes={!!linkedDoctor}
          linkedDoctorId={linkedDoctor?.id}
        />
      </div>
    </div>
  );
}
