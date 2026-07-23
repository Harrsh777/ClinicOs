import { createServiceClient } from "@/lib/supabase/server";

const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createActivationToken(profileId: string, clinicId?: string | null) {
  const service = await createServiceClient();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const { data, error } = await service
    .from("account_activation_tokens")
    .insert({
      profile_id: profileId,
      clinic_id: clinicId ?? null,
      token,
      expires_at: new Date(Date.now() + ACTIVATION_TTL_MS).toISOString(),
    })
    .select("token")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create activation token" };
  return { token: data.token };
}

export async function validateActivationToken(token: string) {
  const service = await createServiceClient();
  const { data } = await service
    .from("account_activation_tokens")
    .select("*, profiles(id, email, full_name, role, clinic_id, staff_code, first_login)")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!data) return { error: "Invalid or expired activation link" };

  const profile = data.profiles as {
    id: string;
    email: string | null;
    full_name: string;
    role: string;
    clinic_id: string | null;
    staff_code: string | null;
    first_login: boolean;
  };

  let clinicCode: string | null = null;
  if (data.clinic_id) {
    const { data: clinic } = await service
      .from("clinics")
      .select("clinic_code, name")
      .eq("id", data.clinic_id)
      .maybeSingle();
    clinicCode = clinic?.clinic_code ?? null;
  }

  return {
    tokenId: data.id,
    profileId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    staffCode: profile.staff_code,
    clinicCode,
    clinicId: data.clinic_id,
  };
}

export async function markActivationTokenUsed(tokenId: string) {
  const service = await createServiceClient();
  await service
    .from("account_activation_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenId);
}

export function activationUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.growclinicos.com";
  return `${base}/activate/${token}`;
}
