import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getPatientDetail } from "@/lib/actions/patients";
import { getPatientEmrRecords } from "@/lib/actions/consultations";
import { getInsurancePolicies } from "@/lib/actions/insurance";
import { PageHeader } from "@/components/ui/card";
import { PatientProfileTabs } from "@/components/patients/patient-profile-tabs";
import { formatPhone, maskAadhaar } from "@/lib/utils";

export default async function ReceptionistPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["receptionist"]);
  const { id } = await params;
  const [{ patient, vitals, allergies, history, documents }, emrRecords, policies] = await Promise.all([
    getPatientDetail(id),
    getPatientEmrRecords(id),
    getInsurancePolicies(id),
  ]);
  if (!patient) notFound();

  return (
    <div>
      <PageHeader
        title={patient.full_name}
        subtitle={`${patient.patient_code} · ${formatPhone(patient.phone)}${patient.aadhaar_last_four ? ` · Aadhaar ${maskAadhaar(patient.aadhaar_last_four)}` : ""}`}
        backHref="/receptionist/patients"
        backLabel="All patients"
      />
      <PatientProfileTabs
        patient={patient}
        vitals={vitals}
        allergies={allergies}
        history={history}
        documents={documents}
        policies={policies}
        emrRecords={emrRecords}
        canEdit
        showInsurance
        basePath="/receptionist/patients"
      />
    </div>
  );
}
