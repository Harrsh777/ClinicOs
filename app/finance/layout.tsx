import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["finance_manager"]);
  return (
    <DashboardShell profile={profile} basePath="/finance">
      {children}
    </DashboardShell>
  );
}
