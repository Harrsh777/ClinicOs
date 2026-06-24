import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["hr"]);
  return (
    <DashboardShell profile={profile} basePath="/hr">
      {children}
    </DashboardShell>
  );
}
