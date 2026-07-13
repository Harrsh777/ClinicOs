import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PLATFORM_ADMIN_COOKIE } from "@/lib/auth/platform-admin.constants";
import { verifyPlatformAdminSession } from "@/lib/auth/platform-admin-session";

export async function requirePlatformAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_ADMIN_COOKIE)?.value;
  if (!(await verifyPlatformAdminSession(token))) {
    redirect("/admin/login");
  }
}

export async function isPlatformAdminAuthed(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyPlatformAdminSession(cookieStore.get(PLATFORM_ADMIN_COOKIE)?.value);
}
