import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["clinic_owner"]);
  return (
    <DashboardShell profile={profile} basePath="/owner">
      {children}
    </DashboardShell>
  );
}
