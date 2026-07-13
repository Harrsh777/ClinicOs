import { PageHeader } from "@/components/ui/card";
import { PatientRegistrationHub } from "@/components/patients/patient-registration-hub";

export default function OwnerNewPatientPage() {
  return (
    <div>
      <PageHeader
        title="Register Patients"
        subtitle="Add a single patient or import many at once from a spreadsheet"
      />
      <PatientRegistrationHub basePath="/owner/patients" backHref="/owner/patients" />
    </div>
  );
}
