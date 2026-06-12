import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { PatientQueueView } from "@/components/queue/patient-queue-view";
import { VisitTokenCard } from "@/components/patient/visit-token-card";
import { getPatientActiveVisit } from "@/lib/actions/visits";

export default async function PatientDashboard() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, clinic_id")
    .eq("user_id", profile.id)
    .maybeSingle();

  const activeVisit = patient ? await getPatientActiveVisit(patient.id).catch(() => null) : null;

  return (
    <div>
      <PageHeader
        title={`Hello, ${profile.full_name}`}
        subtitle="Your health dashboard"
      />
      {patient ? (
        <div className="space-y-8">
          {activeVisit && <VisitTokenCard visit={activeVisit} />}
          <PatientQueueView patientId={patient.id} clinicId={patient.clinic_id} />
        </div>
      ) : (
        <div className="clinic-card p-6 text-center text-[var(--text-muted)]">
          <p>Your patient profile is being set up. Contact your clinic if this persists.</p>
        </div>
      )}
    </div>
  );
}
