import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { ExecutiveDashboard } from "@/components/owner/executive-dashboard";
import { ExecutiveDashboardSkeleton } from "@/components/owner/executive-dashboard-skeleton";
import { getExecutiveDashboard } from "@/lib/actions/executive-dashboard";

async function OwnerDashboardContent({
  clinicId,
  userName,
}: {
  clinicId: string;
  userName: string;
}) {
  const data = await getExecutiveDashboard(clinicId);
  return <ExecutiveDashboard data={data} clinicId={clinicId} userName={userName} />;
}

export default async function OwnerDashboard() {
  const profile = await requireRole(["clinic_owner"]);

  return (
    <Suspense fallback={<ExecutiveDashboardSkeleton />}>
      <OwnerDashboardContent clinicId={profile.clinic_id!} userName={profile.full_name} />
    </Suspense>
  );
}
