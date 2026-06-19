import type { PermissionLevel, UserRole } from "@/lib/types/database";

export interface SidebarNavLeaf {
  key: string;
  name: string;
  /** Path relative to role base (e.g. `/patients`). Empty string = dashboard root. */
  path: string;
  moduleKey: string;
  roles?: UserRole[];
}

export interface SidebarNavGroup {
  key: string;
  name: string;
  icon: string;
  moduleKey: string;
  path?: string;
  items: SidebarNavLeaf[];
  roles?: UserRole[];
}

export interface SidebarSectionConfig {
  key: string;
  label: string;
  icon: string;
  roles?: UserRole[];
  requiresFranchise?: boolean;
  groups: SidebarNavGroup[];
}

export interface SidebarNavLeafResolved {
  key: string;
  name: string;
  href: string;
  moduleKey: string;
}

export interface SidebarNavGroupResolved {
  key: string;
  name: string;
  icon: string;
  href?: string;
  items: SidebarNavLeafResolved[];
}

export interface SidebarSectionResolved {
  key: string;
  label: string;
  icon: string;
  groups: SidebarNavGroupResolved[];
}

export type PermissionMap = Record<string, PermissionLevel>;
