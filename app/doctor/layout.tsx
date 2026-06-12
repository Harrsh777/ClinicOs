import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["doctor"]);
  return (
    <DashboardShell profile={profile} basePath="/doctor">
      {children}
    </DashboardShell>
  );
}
