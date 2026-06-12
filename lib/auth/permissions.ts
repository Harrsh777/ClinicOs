import type { PermissionLevel, Profile, SystemModule, UserRole } from "@/lib/types/database";

export interface NavItem {
  key: string;
  name: string;
  href: string;
  icon: string;
  permission: PermissionLevel;
}

const ROLE_DEFAULT_MODULES: Record<UserRole, Record<string, PermissionLevel>> = {
  super_admin: {
    dashboard: "admin",
    clinics: "admin",
    plans: "admin",
    analytics: "admin",
  },
  clinic_owner: {
    dashboard: "admin",
    patients: "admin",
    appointments: "admin",
    queue: "admin",
    consultations: "admin",
    prescriptions: "admin",
    billing: "admin",
    lab: "admin",
    insurance: "admin",
    pharmacy: "admin",
    inventory: "admin",
    revenue: "admin",
    teleconsult: "admin",
    accounting: "admin",
    commissions: "admin",
    ai_insights: "admin",
    branding: "admin",
    franchise: "admin",
    staff: "admin",
    permissions: "admin",
    settings: "admin",
    finance: "admin",
  },
  doctor: {
    dashboard: "read",
    patients: "read",
    appointments: "write",
    queue: "read",
    consultations: "write",
    prescriptions: "write",
    lab: "write",
    teleconsult: "write",
  },
  receptionist: {
    dashboard: "read",
    patients: "write",
    appointments: "write",
    queue: "write",
    billing: "write",
    lab: "write",
    insurance: "write",
    pharmacy: "write",
  },
  finance_manager: {
    dashboard: "read",
    finance: "write",
    billing: "write",
    revenue: "read",
    insurance: "write",
    patients: "read",
  },
  patient: {
    dashboard: "read",
    appointments: "write",
    patients: "read",
    billing: "read",
    prescriptions: "read",
    lab: "read",
    teleconsult: "read",
  },
};

export function resolvePermissions(
  profile: Profile,
  customPermissions: { module_key: string; permission_level: PermissionLevel }[] = []
): Record<string, PermissionLevel> {
  if (profile.role === "super_admin" || profile.role === "clinic_owner") {
    return ROLE_DEFAULT_MODULES[profile.role];
  }

  const perms: Record<string, PermissionLevel> = {
    ...ROLE_DEFAULT_MODULES[profile.role],
  };

  for (const cp of customPermissions) {
    perms[cp.module_key] = cp.permission_level;
  }

  return perms;
}

export function hasPermission(
  permissions: Record<string, PermissionLevel>,
  moduleKey: string,
  required: PermissionLevel = "read"
): boolean {
  const level = permissions[moduleKey];
  if (!level) return false;
  if (required === "read") return true;
  if (required === "write") return level === "write" || level === "admin";
  if (required === "admin") return level === "admin";
  return false;
}

export function buildNavItems(
  modules: SystemModule[],
  permissions: Record<string, PermissionLevel>,
  basePath: string
): NavItem[] {
  return modules
    .filter((m) => hasPermission(permissions, m.key, "read"))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({
      key: m.key,
      name: m.name,
      href: `${basePath}${m.route_path}`,
      icon: m.icon ?? "Circle",
      permission: permissions[m.key] ?? "read",
    }));
}

export const ASSIGNABLE_ROLES: UserRole[] = [
  "doctor",
  "receptionist",
  "finance_manager",
];

export const ASSIGNABLE_MODULES = [
  "patients",
  "appointments",
  "queue",
  "billing",
  "lab",
  "insurance",
  "pharmacy",
  "finance",
  "settings",
] as const;
