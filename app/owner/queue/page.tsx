import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/card";
import { QueueDashboard } from "@/components/queue/queue-dashboard";
import { CheckInPanel } from "@/components/receptionist/check-in-panel";

export default async function OwnerQueuePage() {
  const profile = await requireRole(["clinic_owner"]);
  return (
    <div>
      <PageHeader title="Live Queue" subtitle="Check-in patients and manage tokens" />
      <CheckInPanel clinicId={profile.clinic_id!} />
      <QueueDashboard clinicId={profile.clinic_id!} />
    </div>
  );
}
