import { PageHeader } from "@/components/ui/card";
import { PatientForm } from "@/components/patients/patient-form";

export default function NewPatientPage() {
  return (
    <div>
      <PageHeader title="Register Patient" subtitle="Add a new patient to the clinic" />
      <div className="max-w-2xl">
        <PatientForm />
      </div>
    </div>
  );
}
