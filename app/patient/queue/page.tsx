import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { PatientQueueView } from "@/components/queue/patient-queue-view";
import { Button } from "@/components/ui/button";
import { ListOrdered } from "lucide-react";

export default async function PatientQueuePage() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, clinic_id, clinics(slug)")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!patient) {
    return (
      <div className="clinic-card p-6 text-center text-[var(--text-muted)]">
        Patient record not linked.
      </div>
    );
  }

  const clinicSlug = (patient.clinics as unknown as { slug: string } | null)?.slug;

  return (
    <div>
      <PageHeader title="Live Queue" subtitle="Your real-time position in today's queue" />
      <PatientQueueView patientId={patient.id} clinicId={patient.clinic_id} />
      {clinicSlug && (
        <div className="mt-6">
          <Link href={`/queue/${clinicSlug}/display`} target="_blank">
            <Button variant="secondary" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Open clinic queue display
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
