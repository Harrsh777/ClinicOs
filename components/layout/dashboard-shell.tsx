import { Sidebar } from "@/components/layout/sidebar";
import { getUserPermissions } from "@/lib/auth/session";
import { getLinkedDoctor } from "@/lib/auth/linked-doctor";
import { getOwnerClinicIds } from "@/lib/actions/franchise";
import { buildSidebarNav } from "@/lib/navigation/build-sidebar-nav";
import { getClinicFeatures } from "@/lib/clinic/features";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

interface DashboardShellProps {
  profile: Profile;
  basePath: string;
  children: React.ReactNode;
}

export async function DashboardShell({ profile, basePath, children }: DashboardShellProps) {
  const { permissions } = await getUserPermissions(profile);
  const linkedDoctor = profile.role === "clinic_owner" ? await getLinkedDoctor(profile.id) : null;
  const hasLinkedDoctor = !!linkedDoctor;

  let clinicName: string | undefined;
  let showFranchise = false;

  if (profile.clinic_id) {
    const supabase = await createClient();
    const [{ data: clinic }, clinicIds, { features }] = await Promise.all([
      supabase.from("clinics").select("name, franchise_group_id").eq("id", profile.clinic_id).single(),
      profile.role === "clinic_owner" ? getOwnerClinicIds(profile.clinic_id) : Promise.resolve([profile.clinic_id]),
      getClinicFeatures(profile.clinic_id),
    ]);
    clinicName = clinic?.name;
    showFranchise = clinicIds.length > 1 || !!clinic?.franchise_group_id;

    const sections = buildSidebarNav(profile, permissions, basePath, {
      showFranchise,
      features,
      hasLinkedDoctor,
    });

    return (
      <div className="flex min-h-screen bg-[var(--surface-1)]">
        <Sidebar profile={profile} sections={sections} clinicName={clinicName} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-8 py-8 max-md:px-4">{children}</div>
        </main>
      </div>
    );
  }

  const sections = buildSidebarNav(profile, permissions, basePath, { showFranchise, hasLinkedDoctor });

  return (
    <div className="flex min-h-screen bg-[var(--surface-1)]">
      <Sidebar profile={profile} sections={sections} clinicName={clinicName} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-8 py-8 max-md:px-4">{children}</div>
      </main>
    </div>
  );
}
