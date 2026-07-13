import { TopNavbar } from "@/components/layout/top-navbar";
import { getUserPermissions } from "@/lib/auth/session";
import { getLinkedDoctor } from "@/lib/auth/linked-doctor";
import { getOwnerClinicIds } from "@/lib/actions/franchise";
import { buildSidebarNav } from "@/lib/navigation/build-sidebar-nav";
import { buildTopNav } from "@/lib/navigation/build-top-nav";
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
    const navItems = buildTopNav(sections);

    return (
      <div className="min-h-screen bg-[var(--surface-1)]">
        <TopNavbar
          profile={profile}
          navItems={navItems}
          clinicName={clinicName}
          basePath={basePath}
        />
        <main className="clinic-main-content">{children}</main>
      </div>
    );
  }

  const sections = buildSidebarNav(profile, permissions, basePath, { showFranchise, hasLinkedDoctor });
  const navItems = buildTopNav(sections);

  return (
    <div className="min-h-screen bg-[var(--surface-1)]">
      <TopNavbar
        profile={profile}
        navItems={navItems}
        clinicName={clinicName}
        basePath={basePath}
      />
      <main className="clinic-main-content">{children}</main>
    </div>
  );
}
