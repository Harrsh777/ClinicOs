import { createServiceClient } from "@/lib/supabase/server";
import { resolveClinicFromCode } from "@/lib/auth/clinic-login";
import type { UserRole } from "@/lib/types/database";

export async function resolveOwnerLoginEmail(
  clinicIdInput: string
): Promise<
  | { ok: true; email: string; profileId: string; role: UserRole; clinicId: string }
  | { ok: false; error: string }
> {
  const code = clinicIdInput.trim().toUpperCase();

  if (code === "PLATFORM") {
    return { ok: false, error: "Platform admins must use email login with Clinic ID: PLATFORM." };
  }

  const clinic = await resolveClinicFromCode(code);
  if (!clinic) {
    return { ok: false, error: "Invalid Clinic ID." };
  }

  if (clinic.status === "suspended") {
    return { ok: false, error: "This clinic has been suspended. Contact support." };
  }

  const service = await createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id, email, role, is_active, clinic_id")
    .eq("clinic_id", clinic.id)
    .eq("role", "clinic_owner")
    .maybeSingle();

  if (!profile?.email) {
    return { ok: false, error: "No owner account found for this clinic. Contact support." };
  }

  if (profile.is_active === false) {
    return { ok: false, error: "Your account has been deactivated. Contact support." };
  }

  return {
    ok: true,
    email: profile.email,
    profileId: profile.id,
    role: profile.role as UserRole,
    clinicId: clinic.id,
  };
}
