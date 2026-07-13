import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getPatientDetail, getPatientSummary } from "@/lib/actions/patients";
import { getPatientVisitTimeline } from "@/lib/actions/visits";
import { PageHeader } from "@/components/ui/card";
import { PatientProfileTabs } from "@/components/patients/patient-profile-tabs";
import { PatientSummaryPanel } from "@/components/patients/patient-summary-panel";
import { getPatientAIBriefAction } from "@/lib/actions/ai-patient-brief";
import { AIPatientBriefPanel } from "@/components/patients/ai-patient-brief";

export default async function DoctorPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["doctor", "clinic_owner"]);
  const { id } = await params;

  const [data, summary, visitTimeline, aiBrief] = await Promise.all([
    getPatientDetail(id),
    profile.clinic_id ? getPatientSummary(id, profile.clinic_id) : null,
    getPatientVisitTimeline(id),
    profile.clinic_id ? getPatientAIBriefAction(id).catch(() => null) : null,
  ]);

  const { emrRecords, clinicVisits } = visitTimeline;

  if (!data.patient) notFound();
  if (profile.clinic_id && data.patient.clinic_id !== profile.clinic_id) notFound();

  const enrichedSummary = summary
    ? { ...summary, emrRecords: emrRecords.length ? emrRecords : summary.emrRecords }
    : null;

  return (
    <div>
      <PageHeader
        title={data.patient.full_name}
        subtitle={data.patient.patient_code ? `Patient ID: ${data.patient.patient_code}` : "Patient profile"}
        backHref="/doctor/patients"
        backLabel="All patients"
      />
      {aiBrief && <AIPatientBriefPanel brief={aiBrief} />}
      {enrichedSummary && <PatientSummaryPanel summary={enrichedSummary as unknown as Parameters<typeof PatientSummaryPanel>[0]["summary"]} />}
      <PatientProfileTabs {...data} canEdit={false} emrRecords={emrRecords} clinicVisits={clinicVisits} />
    </div>
  );
}
