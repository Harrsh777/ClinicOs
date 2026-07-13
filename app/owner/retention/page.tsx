import { requireRole } from "@/lib/auth/session";
import { getRetentionDashboardData } from "@/lib/actions/patient-retention";
import { PatientRetentionDashboard } from "@/components/retention/patient-retention-dashboard";

export default async function OwnerRetentionPage() {
  const profile = await requireRole(["clinic_owner"]);
  const data = await getRetentionDashboardData(profile.clinic_id!);

  return <PatientRetentionDashboard data={data} />;
}
