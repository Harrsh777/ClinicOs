import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["patient"]);
  return (
    <DashboardShell profile={profile} basePath="/patient">
      {children}
    </DashboardShell>
  );
}
