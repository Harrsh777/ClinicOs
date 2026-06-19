import { hasPermission } from "@/lib/auth/permissions";
import { SIDEBAR_SECTIONS } from "@/lib/navigation/sidebar-config";
import type {
  PermissionMap,
  SidebarNavGroupResolved,
  SidebarNavLeaf,
  SidebarSectionResolved,
} from "@/lib/navigation/types";
import type { Profile, UserRole } from "@/lib/types/database";

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
  basePath: string
) {
  if (!isRoleAllowed(leaf.roles, role)) return null;
  if (!hasPermission(permissions, leaf.moduleKey, "read")) return null;
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
  basePath: string
): SidebarNavGroupResolved | null {
  if (!isRoleAllowed(group.roles, role)) return null;
  if (!hasPermission(permissions, group.moduleKey, "read")) return null;

  const items = group.items
    .map((leaf) => filterLeaf(leaf, role, permissions, basePath))
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
  options?: { showFranchise?: boolean }
): SidebarSectionResolved[] {
  const { role } = profile;
  const showFranchise = options?.showFranchise ?? false;

  return SIDEBAR_SECTIONS.map((section) => {
    if (!isRoleAllowed(section.roles, role)) return null;
    if (section.requiresFranchise && !showFranchise && section.key === "franchise") {
      // Franchise section visible to owners always (setup flow); hide cross-branch extras until multi-branch
    }

    const groups = section.groups
      .map((group) => filterGroup(group, role, permissions, basePath))
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
