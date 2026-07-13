import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { LiveQueueHub } from "@/components/queue/live-queue-hub";
import { CheckInPanel } from "@/components/receptionist/check-in-panel";
import { ReminderStatusPanel } from "@/components/receptionist/reminder-status-panel";
import { getClinicFollowUpReminders } from "@/lib/actions/follow-up-reminders";

export default async function OwnerQueuePage() {
  const profile = await requireRole(["clinic_owner"]);
  const supabase = await createClient();
  const [{ data: clinic }, reminders] = await Promise.all([
    supabase
      .from("clinics")
      .select("slug")
      .eq("id", profile.clinic_id!)
      .single(),
    getClinicFollowUpReminders(profile.clinic_id!),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Queue"
        subtitle="Real-time patient flow management powered by intelligent queue prediction"
      />
      <ReminderStatusPanel reminders={reminders} />
      <LiveQueueHub
        clinicId={profile.clinic_id!}
        clinicSlug={clinic?.slug}
        userRole={profile.role}
        showCheckIn={<CheckInPanel clinicId={profile.clinic_id!} />}
      />
    </div>
  );
}
