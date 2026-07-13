import { requireRole } from "@/lib/auth/session";
import { ExecutiveDashboard } from "@/components/owner/executive-dashboard";
import { getExecutiveDashboard } from "@/lib/actions/executive-dashboard";

export default async function OwnerDashboard() {
  const profile = await requireRole(["clinic_owner"]);
  const data = await getExecutiveDashboard(profile.clinic_id!);

  return (
    <ExecutiveDashboard
      data={data}
      clinicId={profile.clinic_id!}
      userName={profile.full_name}
    />
  );
}
