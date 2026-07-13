"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import type { TopNavItem } from "@/lib/navigation/build-top-nav";
import { sectionIsActive } from "@/lib/navigation/build-top-nav";
import type { SidebarSectionResolved } from "@/lib/navigation/types";
import type { Profile } from "@/lib/types/database";
import { logoutAction } from "@/lib/actions/auth";
import { NotificationBell } from "@/components/notifications/notification-bell";

function isHrefActive(pathname: string, href: string) {
  if (href === pathname) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  return false;
}

interface TopNavbarProps {
  profile: Profile;
  navItems: TopNavItem[];
  sections: SidebarSectionResolved[];
  clinicName?: string;
  basePath: string;
}

function NavDropdown({
  item,
  pathname,
  open,
  onToggle,
}: {
  item: TopNavItem;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const active =
    item.children.some((c) => isHrefActive(pathname, c.href));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (open) onToggle();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onToggle]);

  if (item.children.length <= 1) {
    const href = item.children[0]?.href ?? item.href;
    const linkActive = isHrefActive(pathname, href);
    return (
      <Link
        href={href}
        className={cn("clinic-topnav-pill", linkActive && "active")}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn("clinic-topnav-pill", active && "active")}
        aria-expanded={open}
      >
        {item.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn("clinic-topnav-dropdown", open && "open")} style={{ left: 0, right: "auto", minWidth: "11rem" }}>
        {item.children.map((child) => (
          <Link
            key={child.key}
            href={child.href}
            className={cn(
              "clinic-topnav-dropdown-item",
              isHrefActive(pathname, child.href) && "active"
            )}
            onClick={onToggle}
          >
            {child.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="clinic-topnav-user"
        aria-expanded={open}
      >
        <div className="clinic-topnav-avatar">{getInitials(profile.full_name)}</div>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{profile.full_name}</p>
          <p className="truncate text-xs capitalize text-[var(--text-muted)]">
            {profile.role.replace(/_/g, " ")}
          </p>
        </div>
        <ChevronDown className={cn("hidden h-3.5 w-3.5 text-[var(--text-muted)] sm:block transition-transform", open && "rotate-180")} />
      </button>

      <div className={cn("clinic-topnav-dropdown", open && "open")}>
        <form action={logoutAction}>
          <button type="submit" className="clinic-topnav-dropdown-item danger">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function TopNavbar({ profile, navItems, sections, clinicName, basePath }: TopNavbarProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeSection = useMemo(() => {
    for (const section of sections) {
      if (sectionIsActive(section, pathname)) return section;
    }
    return null;
  }, [pathname, sections]);

  const subNavItems = useMemo(() => {
    if (!activeSection) return [];
    const items: { key: string; name: string; href: string }[] = [];
    for (const group of activeSection.groups) {
      for (const item of group.items) {
        items.push({ key: item.key, name: item.name, href: item.href });
      }
    }
    return items.length > 1 ? items : [];
  }, [activeSection]);

  return (
    <>
      <header className="clinic-topnav">
        <div className="clinic-topnav-inner">
          <Link href={basePath} className="clinic-topnav-brand">
            <div className="clinic-topnav-logo">
              <Activity className="h-4 w-4" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                ClinicOS
              </p>
              {clinicName && (
                <p className="truncate text-xs text-[var(--text-muted)]">{clinicName}</p>
              )}
            </div>
          </Link>

          <nav className="clinic-topnav-pills hidden lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavDropdown
                key={item.key}
                item={item}
                pathname={pathname}
                open={openDropdown === item.key}
                onToggle={() =>
                  setOpenDropdown((prev) => (prev === item.key ? null : item.key))
                }
              />
            ))}
          </nav>

          <div className="clinic-topnav-actions">
            <NotificationBell variant="light" />
            <UserMenu profile={profile} />
            <button
              type="button"
              className="clinic-topnav-icon-btn lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {subNavItems.length > 0 && (
          <div className="clinic-topnav-subnav">
            {subNavItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "clinic-topnav-subpill",
                  isHrefActive(pathname, item.href) && "active"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-[var(--text-primary)]">Menu</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="clinic-topnav-icon-btn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {navItems.map((item) => (
              <div key={item.key} className="mb-3">
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {item.label}
                </p>
                {item.children.map((child) => (
                  <Link
                    key={child.key}
                    href={child.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-1)]",
                      isHrefActive(pathname, child.href) && "bg-[var(--brand-50)] text-[var(--brand-600)]"
                    )}
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
