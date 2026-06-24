import { requireRole, getClinicSetupDone } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["clinic_owner"]);
  const setupFromMiddleware = await getClinicSetupDone();

  let setupDone = setupFromMiddleware ?? false;
  if (setupFromMiddleware === null) {
    const supabase = await createClient();
    const { data: clinic } = await supabase
      .from("clinics")
      .select("clinic_setup_completed")
      .eq("id", profile.clinic_id!)
      .maybeSingle();
    setupDone = clinic?.clinic_setup_completed ?? false;
  }

  if (!setupDone) {
    return <div className="min-h-screen bg-[var(--bg-primary)]">{children}</div>;
  }

  return (
    <DashboardShell profile={profile} basePath="/owner">
      {children}
    </DashboardShell>
  );
}
