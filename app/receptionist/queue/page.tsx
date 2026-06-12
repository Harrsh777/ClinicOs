import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/card";
import { QueueDashboard } from "@/components/queue/queue-dashboard";
import { CheckInPanel } from "@/components/receptionist/check-in-panel";

export default async function QueuePage() {
  const profile = await requireRole(["receptionist", "clinic_owner"]);
  return (
    <div>
      <PageHeader title="Reception Desk" subtitle="Check-in patients and manage the live queue" />
      <CheckInPanel clinicId={profile.clinic_id!} />
      <QueueDashboard clinicId={profile.clinic_id!} />
    </div>
  );
}
