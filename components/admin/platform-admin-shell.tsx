import Link from "next/link";
import { Activity, LogOut } from "lucide-react";
import { platformAdminLogoutAction } from "@/lib/actions/platform-admin-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/clinics", label: "Clinics" },
  { href: "/admin/demo-requests", label: "Demo Requests" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/clinic-requests", label: "Clinic Requests" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/plans", label: "Plans" },
];

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--surface-1)]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-white">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">ClinicOS</p>
            <p className="text-xs text-[var(--text-muted)]">Platform Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <AdminNavLink key={item.href} href={item.href} exact={item.exact}>
              {item.label}
            </AdminNavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <form action={platformAdminLogoutAction}>
            <Button type="submit" variant="secondary" size="sm" className="w-full gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-8 py-8 max-md:px-4">{children}</div>
      </main>
    </div>
  );
}

function AdminNavLink({
  href,
  exact,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
        "data-[active=true]:bg-teal-50 data-[active=true]:text-[var(--secondary)]"
      )}
    >
      {children}
    </Link>
  );
}
