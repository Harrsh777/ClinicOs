import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["super_admin"]);
  return (
    <DashboardShell profile={profile} basePath="/admin">
      {children}
    </DashboardShell>
  );
}
