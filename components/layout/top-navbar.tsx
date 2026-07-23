"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LogOut,
  ChevronDown,
  Cog,
} from "lucide-react";
import { ClinicOsWordmark } from "@/components/brand/clinicos-wordmark";
import { cn, getInitials } from "@/lib/utils";
import type { TopNavItem } from "@/lib/navigation/build-top-nav";
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
  settingsHref?: string | null;
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const active =
    item.children.some((c) => isHrefActive(pathname, c.href));

  useEffect(() => {
    function updatePosition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuStyle({
        top: rect.bottom + 8,
        left: rect.left,
        minWidth: rect.width,
      });
    }

    if (open) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
    setMenuStyle(null);
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const clickedMenu = ref.current?.contains(target);
      const clickedButton = buttonRef.current?.contains(target);
      if (!clickedMenu && !clickedButton && open) onToggle();
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

  const dropdownMenu =
    open && menuStyle
      ? createPortal(
          <div
            ref={ref}
            className="clinic-topnav-dropdown open"
            style={{
              position: "fixed",
              top: menuStyle.top,
              left: menuStyle.left,
              width: "max-content",
              minWidth: menuStyle.minWidth,
              zIndex: 80,
            }}
          >
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
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className={cn("clinic-topnav-pill", active && "active")}
        aria-expanded={open}
      >
        {item.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {dropdownMenu}
    </>
  );
}

function UserMenu({
  profile,
  settingsHref,
  onNavigate,
}: {
  profile: Profile;
  settingsHref?: string | null;
  onNavigate?: () => void;
}) {
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

      <div className={cn("clinic-topnav-dropdown clinic-topnav-user-dropdown", open && "open")}>
        {settingsHref && (
          <Link
            href={settingsHref}
            className="clinic-topnav-dropdown-item"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <Cog className="h-4 w-4" />
            Settings
          </Link>
        )}
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

export function TopNavbar({ profile, navItems, settingsHref, clinicName, basePath }: TopNavbarProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="clinic-topnav">
      <div className="clinic-topnav-inner">
        <Link href={basePath} className="clinic-topnav-brand">
          <div className="hidden min-w-0 sm:block">
            <ClinicOsWordmark
              className="text-base"
              clinicClassName="text-[var(--text-primary)]"
              osClassName="text-[var(--brand-600)]"
            />
            {clinicName && (
              <p className="truncate text-xs text-[var(--text-muted)]">{clinicName}</p>
            )}
          </div>
          <ClinicOsWordmark
            className="text-base sm:hidden"
            clinicClassName="text-[var(--text-primary)]"
            osClassName="text-[var(--brand-600)]"
          />
        </Link>

        <div className="clinic-topnav-pills-wrap">
          <nav className="clinic-topnav-pills" aria-label="Main navigation">
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
        </div>

        <div className="clinic-topnav-actions">
          <NotificationBell variant="light" />
          <UserMenu profile={profile} settingsHref={settingsHref} />
        </div>
      </div>
    </header>
  );
}
