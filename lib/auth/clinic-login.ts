import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

const PLATFORM_CODE = "PLATFORM";

/** Fallback when migration 007 not applied yet */
const LEGACY_CLINIC_CODES: Record<string, string> = {
  "CLN-DEMO01": "a0000001-0000-4000-8000-000000000001",
};

export async function resolveClinicFromCode(code: string) {
  const normalized = code.trim().toUpperCase();
  const service = await createServiceClient();

  const { data: byCode, error } = await service
    .from("clinics")
    .select("id, clinic_code, status, name")
    .eq("clinic_code", normalized)
    .maybeSingle();

  if (!error && byCode) return byCode;

  const legacyId = LEGACY_CLINIC_CODES[normalized];
  if (legacyId) {
    const { data: clinic } = await service
      .from("clinics")
      .select("id, status, name")
      .eq("id", legacyId)
      .maybeSingle();
    if (clinic) return { ...clinic, clinic_code: normalized };
  }

  return null;
}

export async function repairProfileClinicLink(
  userId: string,
  role: UserRole,
  clinicCodeInput: string
): Promise<string | null> {
  if (role === "super_admin") return null;

  const clinic = await resolveClinicFromCode(clinicCodeInput);
  if (!clinic) return null;

  const service = await createServiceClient();
  await service
    .from("profiles")
    .update({ clinic_id: clinic.id })
    .eq("id", userId);

  return clinic.id;
}

export async function validateClinicLogin(
  clinicIdInput: string,
  userId: string,
  role: UserRole,
  profileClinicId: string | null
): Promise<{ ok: true; clinicId: string | null } | { ok: false; error: string }> {
  const code = clinicIdInput.trim().toUpperCase();

  if (role === "super_admin") {
    if (code !== PLATFORM_CODE) {
      return { ok: false, error: `Platform admins must use Clinic ID: ${PLATFORM_CODE}` };
    }
    return { ok: true, clinicId: null };
  }

  if (!code) {
    return { ok: false, error: "Clinic ID is required" };
  }

  const clinic = await resolveClinicFromCode(code);

  if (!clinic) {
    return { ok: false, error: "Invalid Clinic ID. For demo use CLN-DEMO01." };
  }

  if (clinic.status === "suspended") {
    return { ok: false, error: "This clinic has been suspended. Contact ClinicOS support." };
  }

  let linkedClinicId = profileClinicId;
  if (!linkedClinicId || linkedClinicId !== clinic.id) {
    linkedClinicId = await repairProfileClinicLink(userId, role, code);
  }

  if (!linkedClinicId || linkedClinicId !== clinic.id) {
    return {
      ok: false,
      error: "This account is not registered with the clinic ID you entered.",
    };
  }

  return { ok: true, clinicId: linkedClinicId };
}

export { PLATFORM_CODE };
