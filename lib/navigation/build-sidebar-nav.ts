import { hasPermission } from "@/lib/auth/permissions";
import { isFeatureEnabled, type ClinicFeatures } from "@/lib/clinic/features";
import { isClinicModuleEnabled, type ClinicModuleMap } from "@/lib/clinic/modules";
import { SIDEBAR_SECTIONS } from "@/lib/navigation/sidebar-config";
import type {
  PermissionMap,
  SidebarNavGroupResolved,
  SidebarNavLeaf,
  SidebarSectionResolved,
} from "@/lib/navigation/types";
import type { Profile, UserRole } from "@/lib/types/database";

const MODULE_FEATURE_MAP: Partial<Record<string, keyof ClinicFeatures>> = {
  teleconsult: "teleconsult",
  ai_insights: "ai_insights",
  pharmacy: "pharmacy",
  lab: "lab",
  revenue: "analytics",
  franchise: "white_label",
  branding: "white_label",
};

function isModuleAvailable(
  moduleKey: string,
  features?: ClinicFeatures,
  modules?: ClinicModuleMap
): boolean {
  if (modules && !isClinicModuleEnabled(modules, moduleKey)) return false;
  if (!features) return true;
  const featureKey = MODULE_FEATURE_MAP[moduleKey];
  if (!featureKey) return true;
  return isFeatureEnabled(features, featureKey);
}

function isRoleAllowed(allowed: UserRole[] | undefined, role: UserRole) {
  return !allowed || allowed.includes(role);
}

function resolveHref(basePath: string, path: string) {
  if (!path) return basePath;
  return `${basePath}${path}`;
}

function filterLeaf(
  leaf: SidebarNavLeaf,
  role: UserRole,
  permissions: PermissionMap,
  basePath: string,
  features?: ClinicFeatures,
  modules?: ClinicModuleMap,
  hasLinkedDoctor?: boolean
) {
  if (!isRoleAllowed(leaf.roles, role)) return null;
  if (leaf.requiresLinkedDoctor && !hasLinkedDoctor) return null;
  if (!hasPermission(permissions, leaf.moduleKey, "read")) return null;
  if (!isModuleAvailable(leaf.moduleKey, features, modules)) return null;
  return {
    key: leaf.key,
    name: leaf.name,
    href: resolveHref(basePath, leaf.path),
    moduleKey: leaf.moduleKey,
  };
}

function filterGroup(
  group: (typeof SIDEBAR_SECTIONS)[number]["groups"][number],
  role: UserRole,
  permissions: PermissionMap,
  basePath: string,
  features?: ClinicFeatures,
  modules?: ClinicModuleMap,
  hasLinkedDoctor?: boolean
): SidebarNavGroupResolved | null {
  if (!isRoleAllowed(group.roles, role)) return null;
  if (group.requiresLinkedDoctor && !hasLinkedDoctor) return null;
  if (!hasPermission(permissions, group.moduleKey, "read")) return null;
  if (!isModuleAvailable(group.moduleKey, features, modules)) return null;

  const items = group.items
    .map((leaf) => filterLeaf(leaf, role, permissions, basePath, features, modules, hasLinkedDoctor))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) return null;

  return {
    key: group.key,
    name: group.name,
    icon: group.icon,
    href: group.path ? resolveHref(basePath, group.path) : undefined,
    items,
  };
}

export function buildSidebarNav(
  profile: Profile,
  permissions: PermissionMap,
  basePath: string,
  options?: {
    showFranchise?: boolean;
    features?: ClinicFeatures;
    modules?: ClinicModuleMap;
    hasLinkedDoctor?: boolean;
  }
): SidebarSectionResolved[] {
  const { role } = profile;
  const showFranchise = options?.showFranchise ?? false;
  const features = options?.features;
  const modules = options?.modules;
  const hasLinkedDoctor = options?.hasLinkedDoctor ?? false;

  return SIDEBAR_SECTIONS.map((section) => {
    if (!isRoleAllowed(section.roles, role)) return null;
    if (section.requiresLinkedDoctor && !hasLinkedDoctor) return null;
    if (section.requiresFranchise && !showFranchise && section.key === "franchise") {
      // Franchise section visible to owners always (setup flow); hide cross-branch extras until multi-branch
    }

    const groups = section.groups
      .map((group) => filterGroup(group, role, permissions, basePath, features, modules, hasLinkedDoctor))
      .filter((group): group is SidebarNavGroupResolved => group !== null);

    if (groups.length === 0) return null;

    return {
      key: section.key,
      label: section.label,
      icon: section.icon,
      groups,
    };
  }).filter((section): section is SidebarSectionResolved => section !== null);
}
