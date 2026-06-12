import { notFound } from "next/navigation";
import { getPatientDetail } from "@/lib/actions/patients";
import { getPatientEmrRecords } from "@/lib/actions/consultations";
import { PageHeader } from "@/components/ui/card";
import { PatientProfileTabs } from "@/components/patients/patient-profile-tabs";
import { formatPhone, maskAadhaar } from "@/lib/utils";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ patient, vitals, allergies, history, documents }, emrRecords] = await Promise.all([
    getPatientDetail(id),
    getPatientEmrRecords(id),
  ]);
  if (!patient) notFound();

  return (
    <div>
      <PageHeader
        title={patient.full_name}
        subtitle={`${patient.patient_code} · ${formatPhone(patient.phone)}${patient.aadhaar_last_four ? ` · Aadhaar ${maskAadhaar(patient.aadhaar_last_four)}` : ""}`}
      />
      <PatientProfileTabs
        patient={patient}
        vitals={vitals}
        allergies={allergies}
        history={history}
        documents={documents}
        emrRecords={emrRecords}
        canEdit
        showInsurance
      />
    </div>
  );
}
