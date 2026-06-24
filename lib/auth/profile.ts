import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

const VALID_ROLES: UserRole[] = [
  "super_admin",
  "clinic_owner",
  "doctor",
  "receptionist",
  "finance_manager",
  "nurse",
  "pharmacist",
  "lab_technician",
  "hr",
  "administrator",
  "patient",
];

const DEMO_CLINIC_ID = "a0000001-0000-4000-8000-000000000001";

function resolveRole(user: User): UserRole {
  const raw = user.user_metadata?.role;
  if (typeof raw === "string" && VALID_ROLES.includes(raw as UserRole)) {
    return raw as UserRole;
  }
  return "patient";
}

function resolveClinicId(role: UserRole): string | null {
  return role === "super_admin" ? null : DEMO_CLINIC_ID;
}

export type LoginProfile = { role: UserRole; is_active: boolean; clinic_id?: string | null };

export async function resolveLoginProfile(
  user: User
): Promise<{
  profile: LoginProfile | null;
  clinicId?: string | null;
  reason?: "deactivated" | "missing";
}> {
  const service = await createServiceClient();
  const { data: existing } = await service
    .from("profiles")
    .select("role, is_active, clinic_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.is_active === false) {
      return { profile: null, reason: "deactivated" };
    }
    return { profile: existing as LoginProfile, clinicId: existing.clinic_id };
  }

  const role = resolveRole(user);
  const base = {
    id: user.id,
    email: user.email,
    full_name:
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      "User",
    role,
    is_active: true,
  };

  let clinicId = resolveClinicId(role);
  if (clinicId) {
    const { data: clinic } = await service
      .from("clinics")
      .select("id")
      .eq("id", clinicId)
      .maybeSingle();
    if (!clinic) clinicId = null;
  }

  const { data: created, error } = await service
    .from("profiles")
    .insert({ ...base, clinic_id: clinicId })
    .select("role, is_active, clinic_id")
    .single();

  if (error || !created) {
    return { profile: null, reason: "missing" };
  }

  return { profile: created as LoginProfile, clinicId: created.clinic_id };
}

export function isProfileSuspended(
  profile: { is_active: boolean } | null | undefined
): boolean {
  return profile?.is_active === false;
}
