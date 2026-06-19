"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  LayoutDashboard, Users, Calendar, ListOrdered, UserCog, Shield,
  Settings, Building2, CreditCard, IndianRupee, LogOut, Activity,
  Stethoscope, Pill, Receipt, FlaskConical, ShieldCheck, PillBottle,
  Package, TrendingUp, Video, Calculator, Percent, Sparkles, Palette, BarChart3,
  LayoutGrid, FileHeart, FolderOpen, HeartHandshake, QrCode, ClipboardList,
  ShieldAlert, Share2, FileText, Scan, AlertTriangle, CalendarClock, BarChart2,
  Mic, Bot, Phone, Brain, GitCompare, Plug, ChevronDown, Circle,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import type { SidebarSectionResolved } from "@/lib/navigation/types";
import type { Profile } from "@/lib/types/database";
import { logoutAction } from "@/lib/actions/auth";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, Calendar, ListOrdered, UserCog, Shield,
  Settings, Building2, CreditCard, IndianRupee, Activity,
  Stethoscope, Pill, Receipt, FlaskConical, ShieldCheck, PillBottle,
  Package, TrendingUp, Video, Calculator, Percent, Sparkles, Palette, BarChart3,
  LayoutGrid, FileHeart, FolderOpen, HeartHandshake, QrCode, ClipboardList,
  ShieldAlert, Share2, FileText, Scan, AlertTriangle, CalendarClock, BarChart2,
  Mic, Bot, Phone, Brain, GitCompare, Plug, Circle,
};

interface SidebarProps {
  profile: Profile;
  sections: SidebarSectionResolved[];
  clinicName?: string;
}

function isHrefActive(pathname: string, href: string) {
  if (href === pathname) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  return false;
}

function NavGroup({
  group,
  pathname,
  defaultOpen,
}: {
  group: SidebarSectionResolved["groups"][number];
  pathname: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = ICON_MAP[group.icon] ?? Circle;
  const groupActive =
    group.items.some((item) => isHrefActive(pathname, item.href)) ||
    (group.href ? isHrefActive(pathname, group.href) : false);

  return (
    <div className="clinic-nav-group">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn("clinic-nav-group-trigger", groupActive && "active")}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{group.name}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="clinic-nav-subitems">
          {group.items.map((item) => {
            const active = isHrefActive(pathname, item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn("clinic-nav-subitem", active && "active")}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ profile, sections, clinicName }: SidebarProps) {
  const pathname = usePathname();
  const activeSectionKey = useMemo(() => {
    for (const section of sections) {
      for (const group of section.groups) {
        if (group.items.some((item) => isHrefActive(pathname, item.href))) {
          return section.key;
        }
      }
    }
    return sections[0]?.key ?? "dashboard";
  }, [pathname, sections]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  function isSectionOpen(key: string) {
    if (key in openSections) return openSections[key];
    return key === activeSectionKey;
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !isSectionOpen(key) }));
  }

  return (
    <aside className="clinic-sidebar">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-500)] text-white text-sm font-bold">
          <Activity className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">ClinicOS</p>
          {clinicName && (
            <p className="truncate text-xs text-[var(--text-muted)]">{clinicName}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {sections.map((section) => {
          const sectionOpen = isSectionOpen(section.key);
          const sectionActive = section.key === activeSectionKey;

          return (
            <div key={section.key} className="clinic-nav-section">
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className={cn("clinic-nav-section-trigger", sectionActive && "active")}
              >
                <span className="text-base leading-none" aria-hidden>
                  {section.icon}
                </span>
                <span className="flex-1 truncate text-left">{section.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform",
                    sectionOpen && "rotate-180"
                  )}
                />
              </button>

              {sectionOpen && (
                <div className="clinic-nav-section-body">
                  {section.groups.map((group) => (
                    <NavGroup
                      key={group.key}
                      group={group}
                      pathname={pathname}
                      defaultOpen={
                        group.items.some((item) => isHrefActive(pathname, item.href)) ||
                        (group.href ? isHrefActive(pathname, group.href) : false)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-100)] text-xs font-semibold text-[var(--brand-700)]">
            {getInitials(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile.full_name}</p>
            <p className="truncate text-xs text-[var(--text-muted)] capitalize">
              {profile.role.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="clinic-nav-item w-full text-[var(--danger-500)]">
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
