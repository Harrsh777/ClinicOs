import { headers } from "next/headers";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { PlatformAdminShell } from "@/components/admin/platform-admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  await requirePlatformAdmin();

  return <PlatformAdminShell>{children}</PlatformAdminShell>;
}
