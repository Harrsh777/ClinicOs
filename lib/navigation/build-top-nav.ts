import type { SidebarSectionResolved } from "@/lib/navigation/types";

export interface TopNavChild {
  key: string;
  name: string;
  href: string;
}

export interface TopNavItem {
  key: string;
  label: string;
  icon: string;
  href: string;
  children: TopNavChild[];
}

function isHrefActive(pathname: string, href: string) {
  if (href === pathname) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  return false;
}

export function sectionIsActive(section: SidebarSectionResolved, pathname: string) {
  return section.groups.some((group) =>
    group.items.some((item) => isHrefActive(pathname, item.href))
  );
}

export function buildTopNav(sections: SidebarSectionResolved[]): TopNavItem[] {
  return sections.map((section) => {
    const children: TopNavChild[] = [];
    for (const group of section.groups) {
      for (const item of group.items) {
        children.push({ key: item.key, name: item.name, href: item.href });
      }
    }

    const primaryHref = children[0]?.href ?? "/";

    return {
      key: section.key,
      label: section.label,
      icon: section.icon,
      href: primaryHref,
      children,
    };
  });
}
