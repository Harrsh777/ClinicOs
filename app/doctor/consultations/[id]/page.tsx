import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getConsultation, getPatientEmrRecords } from "@/lib/actions/consultations";
import { getLabTests } from "@/lib/actions/lab";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { ConsultationRoom } from "@/components/consultations/consultation-room";

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["doctor"]);
  const { id } = await params;
  const consultation = await getConsultation(id);
  if (!consultation) notFound();

  const supabase = await createClient();
  const [allergies, emrRecords, labTests] = await Promise.all([
    supabase.from("patient_allergies").select("*").eq("patient_id", consultation.patient_id),
    getPatientEmrRecords(consultation.patient_id),
    profile.clinic_id ? getLabTests(profile.clinic_id) : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Consultation"
        subtitle={(consultation.patients as { full_name: string })?.full_name}
      />
      <ConsultationRoom
        consultation={consultation as Parameters<typeof ConsultationRoom>[0]["consultation"]}
        allergies={allergies.data ?? []}
        labTests={labTests}
        emrRecords={emrRecords}
      />
    </div>
  );
}
