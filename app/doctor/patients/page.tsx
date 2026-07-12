import { requireRole } from "@/lib/auth/session";
import { getPatients } from "@/lib/actions/patients";
import { PageHeader } from "@/components/ui/card";
import { PatientSearch } from "@/components/patients/patient-search";
import { PatientListTable } from "@/components/patients/patient-list-table";

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireRole(["doctor"]);
  const { q } = await searchParams;
  const patients = await getPatients(profile.clinic_id!, q);

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} patient${patients.length !== 1 ? "s" : ""} — read-only access`}
      />
      <div className="mt-4">
        <PatientSearch defaultValue={q} basePath="/doctor/patients" />
      </div>
      <div className="mt-4">
        <PatientListTable patients={patients} basePath="/doctor/patients" readOnly />
      </div>
    </div>
  );
}
