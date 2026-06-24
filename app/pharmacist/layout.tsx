import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function PharmacistLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["pharmacist"]);
  return (
    <DashboardShell profile={profile} basePath="/pharmacist">
      {children}
    </DashboardShell>
  );
}
