import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/types/database";

export async function savePlatformClinicCredentials(
  service: SupabaseClient,
  params: {
    clinicId: string;
    profileId: string;
    clinicCode: string;
    staffCode: string;
    email: string;
    initialPassword: string;
    role?: UserRole;
  }
) {
  await service.from("platform_clinic_credentials").upsert(
    {
      clinic_id: params.clinicId,
      profile_id: params.profileId,
      clinic_code: params.clinicCode,
      staff_code: params.staffCode,
      email: params.email,
      initial_password: params.initialPassword,
      role: params.role ?? "clinic_owner",
    },
    { onConflict: "clinic_id,profile_id" }
  );
}

export async function getClinicCredentials(service: SupabaseClient, clinicId: string) {
  const { data } = await service
    .from("platform_clinic_credentials")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAllPlatformCredentials(service: SupabaseClient) {
  const { data } = await service
    .from("platform_clinic_credentials")
    .select("*, clinics(name, status, city)")
    .order("created_at", { ascending: false });
  return data ?? [];
}
