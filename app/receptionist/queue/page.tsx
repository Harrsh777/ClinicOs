import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { LiveQueueHub } from "@/components/queue/live-queue-hub";
import { CheckInPanel } from "@/components/receptionist/check-in-panel";

export default async function QueuePage() {
  const profile = await requireRole(["receptionist", "clinic_owner"]);
  const supabase = await createClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("slug")
    .eq("id", profile.clinic_id!)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Queue"
        subtitle="Reception control tower — check in patients and orchestrate flow"
      />
      <LiveQueueHub
        clinicId={profile.clinic_id!}
        clinicSlug={clinic?.slug}
        userRole={profile.role}
        showCheckIn={<CheckInPanel clinicId={profile.clinic_id!} />}
      />
    </div>
  );
}
