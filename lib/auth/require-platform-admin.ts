import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PLATFORM_ADMIN_COOKIE,
  verifyPlatformAdminSession,
} from "@/lib/auth/platform-admin";

export async function requirePlatformAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_ADMIN_COOKIE)?.value;
  if (!verifyPlatformAdminSession(token)) {
    redirect("/admin/login");
  }
}

export async function isPlatformAdminAuthed(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyPlatformAdminSession(cookieStore.get(PLATFORM_ADMIN_COOKIE)?.value);
}
