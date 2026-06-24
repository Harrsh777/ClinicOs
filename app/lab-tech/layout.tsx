import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function LabTechLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["lab_technician"]);
  return (
    <DashboardShell profile={profile} basePath="/lab-tech">
      {children}
    </DashboardShell>
  );
}
