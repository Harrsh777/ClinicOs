import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { LiveQueueHub } from "@/components/queue/live-queue-hub";

export default async function DoctorQueuePage() {
  const profile = await requireRole(["doctor"]);
  const supabase = await createClient();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!doctor) {
    return <div className="clinic-card p-6">Doctor profile not configured.</div>;
  }

  const { data: clinic } = await supabase
    .from("clinics")
    .select("slug")
    .eq("id", profile.clinic_id!)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader title="My Queue" subtitle="Start consultations and manage your patient flow" />
      <LiveQueueHub
        clinicId={profile.clinic_id!}
        clinicSlug={clinic?.slug}
        userRole="doctor"
        doctorId={doctor.id}
      />
    </div>
  );
}
