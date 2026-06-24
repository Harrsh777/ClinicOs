import { createServiceClient } from "@/lib/supabase/server";
import { normalizeStaffCode } from "@/lib/auth/staff-code";
import { resolveClinicFromCode } from "@/lib/auth/clinic-login";
import type { UserRole } from "@/lib/types/database";

export async function resolveStaffLoginEmail(
  clinicIdInput: string,
  staffIdInput: string
): Promise<
  | { ok: true; email: string; profileId: string; role: UserRole; clinicId: string }
  | { ok: false; error: string }
> {
  const code = clinicIdInput.trim().toUpperCase();
  const staffCode = normalizeStaffCode(staffIdInput);

  if (code === "PLATFORM") {
    return { ok: false, error: "Platform admins sign in with email instead of Staff ID." };
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
    .select("id, email, role, is_active, clinic_id, staff_code")
    .eq("clinic_id", clinic.id)
    .eq("staff_code", staffCode)
    .maybeSingle();

  if (!profile) {
    // Legacy fallback: accept email as Staff ID until staff_code is backfilled
    if (staffIdInput.includes("@")) {
      const { data: byEmail } = await service
        .from("profiles")
        .select("id, email, role, is_active, clinic_id, staff_code")
        .eq("clinic_id", clinic.id)
        .eq("email", staffIdInput.toLowerCase())
        .maybeSingle();

      if (byEmail?.email) {
        if (byEmail.is_active === false) {
          return { ok: false, error: "Your account has been deactivated. Contact your clinic administrator." };
        }
        return {
          ok: true,
          email: byEmail.email,
          profileId: byEmail.id,
          role: byEmail.role as UserRole,
          clinicId: clinic.id,
        };
      }
    }
    return { ok: false, error: "Invalid Staff ID for this clinic." };
  }

  if (!profile.email) {
    return { ok: false, error: "Account not fully configured. Contact your administrator." };
  }

  if (profile.is_active === false) {
    return { ok: false, error: "Your account has been deactivated. Contact your clinic administrator." };
  }

  return {
    ok: true,
    email: profile.email,
    profileId: profile.id,
    role: profile.role as UserRole,
    clinicId: clinic.id,
  };
}
