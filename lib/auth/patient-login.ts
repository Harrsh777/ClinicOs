import { createServiceClient } from "@/lib/supabase/server";
import { resolveClinicFromCode } from "@/lib/auth/clinic-login";

export function normalizePatientPhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/** Stable synthetic email per clinic + phone for Supabase Auth */
export function patientAuthEmail(phone: string, clinicCode: string): string {
  const normalized = normalizePatientPhone(phone);
  const code = clinicCode.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `${normalized}.${code}@patients.clinicos.app`;
}

export async function findPatientByPhone(clinicId: string, phone: string) {
  const normalized = normalizePatientPhone(phone);
  if (normalized.length !== 10) return null;

  const service = await createServiceClient();
  const { data } = await service
    .from("patients")
    .select("id, full_name, phone, user_id, email, clinic_id")
    .eq("clinic_id", clinicId)
    .ilike("phone", `%${normalized}`)
    .maybeSingle();

  return data;
}

export async function resolvePatientLoginEmail(clinicCodeInput: string, phoneInput: string) {
  const clinic = await resolveClinicFromCode(clinicCodeInput);
  if (!clinic) return { ok: false as const, error: "Invalid Clinic ID." };
  if (clinic.status === "suspended") {
    return { ok: false as const, error: "This clinic has been suspended. Contact support." };
  }

  const phone = normalizePatientPhone(phoneInput);
  if (phone.length !== 10) {
    return { ok: false as const, error: "Enter a valid 10-digit mobile number." };
  }

  const patient = await findPatientByPhone(clinic.id, phone);
  if (!patient?.user_id) {
    return {
      ok: false as const,
      error: "No patient account found. Sign up from your clinic portal or book an appointment first.",
    };
  }

  const service = await createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id, email, is_active, role")
    .eq("id", patient.user_id)
    .maybeSingle();

  if (!profile?.email) {
    return { ok: false as const, error: "Patient account is not fully configured." };
  }
  if (profile.is_active === false) {
    return { ok: false as const, error: "Your account has been deactivated. Contact your clinic." };
  }
  if (profile.role !== "patient") {
    return { ok: false as const, error: "This login is for patient accounts only." };
  }

  return {
    ok: true as const,
    email: profile.email,
    profileId: profile.id,
    clinicId: clinic.id,
    clinicCode: clinic.clinic_code ?? clinicCodeInput.toUpperCase(),
    patientId: patient.id,
  };
}
