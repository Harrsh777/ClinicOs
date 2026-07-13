import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getLinkedDoctor } from "@/lib/auth/linked-doctor";
import { getPatientDetail, getPatientSummary, getPatientDoctorNotesMap, type PatientDoctorNote } from "@/lib/actions/patients";
import { getActiveConsultationForPatient } from "@/lib/actions/consultations";
import { getPatientVisitTimeline } from "@/lib/actions/visits";
import { getInsurancePolicies } from "@/lib/actions/insurance";
import { PageHeader } from "@/components/ui/card";
import { PatientProfileTabs } from "@/components/patients/patient-profile-tabs";
import { PatientSummaryPanel } from "@/components/patients/patient-summary-panel";
import { PatientConsultationPanel } from "@/components/patients/patient-consultation-panel";
import { AIPatientBriefPanel } from "@/components/patients/ai-patient-brief";
import { getPatientAIBriefAction } from "@/lib/actions/ai-patient-brief";
import { formatPhone, maskAadhaar } from "@/lib/utils";

export default async function OwnerPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["clinic_owner"]);
  const { id } = await params;
  const linkedDoctor = await getLinkedDoctor(profile.id);

  const [{ patient, vitals, allergies, history, documents }, visitTimeline, policies, summary, aiBrief, activeConsultation, notesMap] =
    await Promise.all([
      getPatientDetail(id),
      getPatientVisitTimeline(id),
      getInsurancePolicies(id),
      profile.clinic_id ? getPatientSummary(id, profile.clinic_id) : null,
      profile.clinic_id ? getPatientAIBriefAction(id).catch(() => null) : null,
      linkedDoctor ? getActiveConsultationForPatient(id, linkedDoctor.id) : Promise.resolve(null),
      profile.clinic_id ? getPatientDoctorNotesMap(profile.clinic_id, [id]) : Promise.resolve({} as Record<string, PatientDoctorNote>),
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
        backHref="/owner/patients"
        backLabel="All patients"
      />
      {aiBrief && <AIPatientBriefPanel brief={aiBrief} />}
      {linkedDoctor && (
        <PatientConsultationPanel
          patientId={id}
          doctorId={linkedDoctor.id}
          activeConsultationId={activeConsultation?.id}
          latestNote={notesMap[id] ?? null}
        />
      )}
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
        basePath="/owner/patients"
      />
    </div>
  );
}
