import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AdministratorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["administrator"]);
  return (
    <DashboardShell profile={profile} basePath="/administrator">
      {children}
    </DashboardShell>
  );
}
