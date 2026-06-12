"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, ListOrdered, UserCog, Shield,
  Settings, Building2, CreditCard, IndianRupee, LogOut, Activity,
  Stethoscope, Pill, Receipt, FlaskConical, ShieldCheck, PillBottle,
  Package, TrendingUp, Video, Calculator, Percent, Sparkles, Palette, BarChart3,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import type { NavItem } from "@/lib/auth/permissions";
import type { Profile } from "@/lib/types/database";
import { logoutAction } from "@/lib/actions/auth";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, Calendar, ListOrdered, UserCog, Shield,
  Settings, Building2, CreditCard, IndianRupee, Activity,
  Stethoscope, Pill, Receipt, FlaskConical, ShieldCheck, PillBottle,
  Package, TrendingUp, Video, Calculator, Percent, Sparkles, Palette, BarChart3,
};

interface SidebarProps {
  profile: Profile;
  navItems: NavItem[];
  clinicName?: string;
}

export function Sidebar({ profile, navItems, clinicName }: SidebarProps) {
  const pathname = usePathname();

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

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn("clinic-nav-item", isActive && "active")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
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
