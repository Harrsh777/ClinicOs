import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getPatientDetail, getPatientSummary } from "@/lib/actions/patients";
import { getPatientVisitTimeline } from "@/lib/actions/visits";
import { getInsurancePolicies } from "@/lib/actions/insurance";
import { PageHeader } from "@/components/ui/card";
import { PatientProfileTabs } from "@/components/patients/patient-profile-tabs";
import { PatientSummaryPanel } from "@/components/patients/patient-summary-panel";
import { formatPhone, maskAadhaar } from "@/lib/utils";

export default async function ReceptionistPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["receptionist"]);
  const { id } = await params;

  const [{ patient, vitals, allergies, history, documents }, visitTimeline, policies, summary] = await Promise.all([
    getPatientDetail(id),
    getPatientVisitTimeline(id),
    getInsurancePolicies(id),
    profile.clinic_id ? getPatientSummary(id, profile.clinic_id) : null,
  ]);

  const { emrRecords, clinicVisits } = visitTimeline;

  if (!patient) notFound();
  if (profile.clinic_id && patient.clinic_id !== profile.clinic_id) notFound();

  const enrichedSummary = summary
    ? { ...summary, emrRecords: emrRecords.length ? emrRecords : summary.emrRecords }
    : null;

  return (
    <div>
      <PageHeader
        title={patient.full_name}
        subtitle={`${patient.patient_code} · ${formatPhone(patient.phone)}${patient.aadhaar_last_four ? ` · Aadhaar ${maskAadhaar(patient.aadhaar_last_four)}` : ""}`}
        backHref="/receptionist/patients"
        backLabel="All patients"
      />
      {enrichedSummary && (
        <PatientSummaryPanel summary={enrichedSummary as unknown as Parameters<typeof PatientSummaryPanel>[0]["summary"]} />
      )}
      <PatientProfileTabs
        patient={patient}
        vitals={vitals}
        allergies={allergies}
        history={history}
        documents={documents}
        policies={policies}
        emrRecords={emrRecords}
        clinicVisits={clinicVisits}
        canEdit
        showInsurance
        basePath="/receptionist/patients"
      />
    </div>
  );
}
