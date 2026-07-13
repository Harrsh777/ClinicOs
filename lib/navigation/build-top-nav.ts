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

const TOP_NAV_EXCLUDED_SECTIONS = new Set(["administration"]);

export interface TopNavResult {
  items: TopNavItem[];
  settingsHref: string | null;
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

function dedupeChildren(children: TopNavChild[]): TopNavChild[] {
  const seen = new Set<string>();
  return children.filter((child) => {
    if (seen.has(child.href)) return false;
    seen.add(child.href);
    return true;
  });
}

function dedupeTopNavItems(items: TopNavItem[]): TopNavItem[] {
  const canonicalSectionByHref = new Map<string, string>();

  for (const item of items) {
    if (item.key === "dashboard") continue;
    for (const child of item.children) {
      if (!canonicalSectionByHref.has(child.href)) {
        canonicalSectionByHref.set(child.href, item.key);
      }
    }
  }

  return items
    .map((item) => {
      const children =
        item.key === "dashboard"
          ? dedupeChildren(
              item.children.filter((child) => !canonicalSectionByHref.has(child.href))
            )
          : dedupeChildren(item.children);

      return {
        ...item,
        children,
        href: children[0]?.href ?? item.href,
      };
    })
    .filter((item) => item.children.length > 0);
}

export function buildTopNav(sections: SidebarSectionResolved[]): TopNavResult {
  const settingsSection = sections.find((section) => section.key === "administration");
  const settingsHref = settingsSection?.groups.flatMap((group) => group.items)[0]?.href ?? null;

  const items = dedupeTopNavItems(
    sections
      .filter((section) => !TOP_NAV_EXCLUDED_SECTIONS.has(section.key))
      .map((section) => {
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
      })
  );

  return { items, settingsHref };
}
