import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { DoctorQueuePanel } from "@/components/queue/doctor-queue-panel";

export default async function DoctorQueuePage() {
  const profile = await requireRole(["doctor"]);
  const supabase = await createClient();
  const { data: doctor } = await supabase.from("doctors").select("id").eq("profile_id", profile.id).single();

  if (!doctor) {
    return <div className="clinic-card p-6">Doctor profile not configured.</div>;
  }

  return (
    <div>
      <PageHeader title="My Queue" subtitle="Start consultations for waiting patients" />
      <DoctorQueuePanel clinicId={profile.clinic_id!} doctorId={doctor.id} />
    </div>
  );
}
