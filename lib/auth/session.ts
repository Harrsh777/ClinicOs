import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isProfileSuspended } from "@/lib/auth/profile";
import { resolvePermissions } from "@/lib/auth/permissions";
import { ROLE_ROUTES, type Profile, type SystemModule } from "@/lib/types/database";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getProfile(): Promise<Profile | null> {
  const { supabase, user } = await getSession();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login?error=profile_missing");
  if (isProfileSuspended(profile)) redirect("/login?error=account_suspended");
  return profile;
}

export async function requireRole(allowedRoles: Profile["role"][]): Promise<Profile> {
  const profile = await requireAuth();
  if (!allowedRoles.includes(profile.role)) {
    redirect(ROLE_ROUTES[profile.role]);
  }
  return profile;
}

export async function getUserPermissions(profile: Profile) {
  const supabase = await createClient();

  const [{ data: modules }, { data: customPerms }] = await Promise.all([
    supabase.from("system_modules").select("*").eq("is_active", true),
    profile.role === "clinic_owner" || profile.role === "super_admin"
      ? Promise.resolve({ data: [] })
      : supabase
          .from("staff_module_permissions")
          .select("module_key, permission_level")
          .eq("profile_id", profile.id),
  ]);

  const permissions = resolvePermissions(
    profile,
    (customPerms ?? []) as { module_key: string; permission_level: "read" | "write" | "admin" }[]
  );

  return {
    modules: (modules ?? []) as SystemModule[],
    permissions,
  };
}

export async function requireModule(
  profile: Profile,
  moduleKey: string,
  level: "read" | "write" | "admin" = "read"
) {
  const { permissions } = await getUserPermissions(profile);
  const { hasPermission } = await import("@/lib/auth/permissions");
  if (!hasPermission(permissions, moduleKey, level)) {
    redirect(ROLE_ROUTES[profile.role]);
  }
}
