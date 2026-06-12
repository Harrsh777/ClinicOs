import { Sidebar } from "@/components/layout/sidebar";
import { buildNavItems } from "@/lib/auth/permissions";
import { getUserPermissions } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

interface DashboardShellProps {
  profile: Profile;
  basePath: string;
  children: React.ReactNode;
}

export async function DashboardShell({ profile, basePath, children }: DashboardShellProps) {
  const { modules, permissions } = await getUserPermissions(profile);
  const navItems = buildNavItems(modules, permissions, basePath);

  let clinicName: string | undefined;
  if (profile.clinic_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("clinics")
      .select("name")
      .eq("id", profile.clinic_id)
      .single();
    clinicName = data?.name;
  }

  return (
    <div className="flex min-h-screen bg-[var(--surface-1)]">
      <Sidebar profile={profile} navItems={navItems} clinicName={clinicName} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
