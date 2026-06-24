"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ListOrdered,
  UserCog,
  Shield,
  Settings,
  Building2,
  CreditCard,
  IndianRupee,
  LogOut,
  Activity,
  Stethoscope,
  Pill,
  Receipt,
  FlaskConical,
  ShieldCheck,
  PillBottle,
  Package,
  TrendingUp,
  Video,
  Calculator,
  Percent,
  Sparkles,
  Palette,
  BarChart3,
  LayoutGrid,
  FileHeart,
  FolderOpen,
  HeartHandshake,
  QrCode,
  ClipboardList,
  ShieldAlert,
  Share2,
  FileText,
  Scan,
  AlertTriangle,
  CalendarClock,
  BarChart2,
  Mic,
  Bot,
  Phone,
  Brain,
  GitCompare,
  Plug,
  ChevronDown,
  Circle,
  Heart,
  MoreVertical,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import type { SidebarSectionResolved } from "@/lib/navigation/types";
import type { Profile } from "@/lib/types/database";
import { logoutAction } from "@/lib/actions/auth";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Calendar,
  ListOrdered,
  UserCog,
  Shield,
  Settings,
  Building2,
  CreditCard,
  IndianRupee,
  Activity,
  Stethoscope,
  Pill,
  Receipt,
  FlaskConical,
  ShieldCheck,
  PillBottle,
  Package,
  TrendingUp,
  Video,
  Calculator,
  Percent,
  Sparkles,
  Palette,
  BarChart3,
  LayoutGrid,
  FileHeart,
  FolderOpen,
  HeartHandshake,
  QrCode,
  ClipboardList,
  ShieldAlert,
  Share2,
  FileText,
  Scan,
  AlertTriangle,
  CalendarClock,
  BarChart2,
  Mic,
  Bot,
  Phone,
  Brain,
  GitCompare,
  Plug,
  Circle,
  Heart,
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

function sectionIsActive(section: SidebarSectionResolved, pathname: string) {
  return section.groups.some((group) =>
    group.items.some((item) => isHrefActive(pathname, item.href))
  );
}

function sectionItemCount(section: SidebarSectionResolved) {
  return section.groups.reduce((sum, group) => sum + group.items.length, 0);
}

function CollapsiblePanel({
  open,
  children,
  id,
}: {
  open: boolean;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <div
      className={cn(
        "clinic-nav-collapse",
        open && "clinic-nav-collapse-open"
      )}
      aria-hidden={!open}
    >
      <div id={id} className="clinic-nav-collapse-inner">
        {children}
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
  indent = false,
}: {
  href: string;
  label: string;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "clinic-nav-link",
        indent && "clinic-nav-link-nested",
        active && "active"
      )}
    >
      <span className="clinic-nav-link-indicator" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarSection({
  section,
  pathname,
  open,
  onToggle,
}: {
  section: SidebarSectionResolved;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = ICON_MAP[section.icon] ?? Circle;
  const active = sectionIsActive(section, pathname);
  const totalItems = sectionItemCount(section);
  const isSimple = totalItems === 1 && section.groups.length === 1;
  const singleHref = isSimple ? section.groups[0].items[0].href : null;
  const showGroupLabels = section.groups.length > 1;

  if (isSimple && singleHref) {
    const Icon = ICON_MAP[section.icon] ?? Circle;
    const linkActive = isHrefActive(pathname, singleHref);
    return (
      <Link
        href={singleHref}
        className={cn("clinic-nav-direct-link", linkActive && "active")}
      >
        <span className={cn("clinic-nav-section-icon", linkActive && "active")}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate">{section.label}</span>
        <span className="clinic-nav-link-indicator" aria-hidden />
      </Link>
    );
  }

  return (
    <div className={cn("clinic-nav-section", active && "clinic-nav-section-active")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`nav-section-${section.key}`}
        className={cn("clinic-nav-section-trigger", active && "active", open && "expanded")}
      >
        <span className={cn("clinic-nav-section-icon", active && "active")}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 truncate text-left">{section.label}</span>
        {totalItems > 0 && (
          <span className="clinic-nav-section-count">{totalItems}</span>
        )}
        <ChevronDown
          className={cn(
            "clinic-nav-chevron",
            open && "clinic-nav-chevron-open"
          )}
        />
      </button>

      <CollapsiblePanel open={open} id={`nav-section-${section.key}`}>
        <div className="clinic-nav-section-body">
          {section.groups.map((group) => {
            const GroupIcon = ICON_MAP[group.icon] ?? Circle;
            const groupActive = group.items.some((item) =>
              isHrefActive(pathname, item.href)
            );

            if (group.items.length === 1 && !showGroupLabels) {
              const item = group.items[0];
              return (
                <NavLink
                  key={group.key}
                  href={item.href}
                  label={item.name}
                  active={isHrefActive(pathname, item.href)}
                  indent
                />
              );
            }

            return (
              <div key={group.key} className="clinic-nav-group-block">
                {showGroupLabels && (
                  <div
                    className={cn(
                      "clinic-nav-group-label",
                      groupActive && "active"
                    )}
                  >
                    <GroupIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{group.name}</span>
                  </div>
                )}
                <div className="clinic-nav-group-links">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.key}
                      href={item.href}
                      label={item.name}
                      active={isHrefActive(pathname, item.href)}
                      indent
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsiblePanel>
    </div>
  );
}

function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn("clinic-sidebar-user-trigger", open && "open")}
      >
        <div className="clinic-sidebar-avatar">
          {getInitials(profile.full_name)}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
          <p className="truncate text-xs text-slate-400 capitalize">
            {profile.role.replace(/_/g, " ")}
          </p>
        </div>
        <MoreVertical className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      <div
        className={cn(
          "clinic-sidebar-user-menu",
          open && "clinic-sidebar-user-menu-open"
        )}
        id="sidebar-user-menu"
      >
        <form action={logoutAction}>
          <button type="submit" className="clinic-sidebar-user-menu-item danger">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar({ profile, sections, clinicName }: SidebarProps) {
  const pathname = usePathname();

  const activeSectionKey = useMemo(() => {
    for (const section of sections) {
      if (sectionIsActive(section, pathname)) return section.key;
    }
    return sections[0]?.key ?? "dashboard";
  }, [pathname, sections]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenSections((prev) => ({
      ...prev,
      [activeSectionKey]: true,
    }));
  }, [activeSectionKey]);

  function isSectionOpen(key: string) {
    if (key in openSections) return openSections[key];
    return key === activeSectionKey;
  }

  function toggleSection(key: string) {
    const willOpen = !isSectionOpen(key);
    setOpenSections((prev) => {
      const next: Record<string, boolean> = { ...prev, [key]: willOpen };
      if (willOpen) {
        for (const section of sections) {
          if (section.key !== key && sectionItemCount(section) > 1) {
            next[section.key] = false;
          }
        }
      }
      return next;
    });
  }

  return (
    <aside className="clinic-sidebar">
      <div className="clinic-sidebar-header">
        <div className="clinic-sidebar-brand">
          <div className="clinic-sidebar-logo">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">ClinicOS</p>
            {clinicName ? (
              <p className="truncate text-xs text-slate-400">{clinicName}</p>
            ) : (
              <p className="text-xs text-slate-500">MedERP Platform</p>
            )}
          </div>
        </div>
      </div>

      <nav className="clinic-sidebar-nav" aria-label="Main navigation">
        {sections.map((section) => (
          <SidebarSection
            key={section.key}
            section={section}
            pathname={pathname}
            open={isSectionOpen(section.key)}
            onToggle={() => toggleSection(section.key)}
          />
        ))}
      </nav>

      <div className="clinic-sidebar-footer">
        <UserMenu profile={profile} />
      </div>
    </aside>
  );
}
