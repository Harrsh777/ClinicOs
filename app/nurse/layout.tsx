import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function NurseLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["nurse"]);
  return (
    <DashboardShell profile={profile} basePath="/nurse">
      {children}
    </DashboardShell>
  );
}
