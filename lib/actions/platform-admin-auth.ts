"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PLATFORM_ADMIN_COOKIE,
  createPlatformAdminSessionToken,
  platformAdminCookieOptions,
  verifyPlatformAdminPassword,
} from "@/lib/auth/platform-admin";

export async function platformAdminLoginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyPlatformAdminPassword(password)) {
    return { error: "Invalid password" };
  }

  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_ADMIN_COOKIE, createPlatformAdminSessionToken(), platformAdminCookieOptions);

  redirect("/admin");
}

export async function platformAdminLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(PLATFORM_ADMIN_COOKIE);
  redirect("/admin/login");
}
