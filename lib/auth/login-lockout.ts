import { createServiceClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function checkAccountLocked(profileId: string): Promise<{ locked: boolean; message?: string }> {
  const service = await createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("locked_until, failed_login_count")
    .eq("id", profileId)
    .maybeSingle();

  if (!data?.locked_until) return { locked: false };

  const lockedUntil = new Date(data.locked_until);
  if (lockedUntil > new Date()) {
    const mins = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
    return {
      locked: true,
      message: `Account locked after ${MAX_ATTEMPTS} failed attempts. Try again in ${mins} minute(s).`,
    };
  }

  await service
    .from("profiles")
    .update({ failed_login_count: 0, locked_until: null })
    .eq("id", profileId);

  return { locked: false };
}

export async function recordFailedLogin(profileId: string) {
  const service = await createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("failed_login_count")
    .eq("id", profileId)
    .single();

  const count = (data?.failed_login_count ?? 0) + 1;
  const updates: { failed_login_count: number; locked_until?: string } = { failed_login_count: count };

  if (count >= MAX_ATTEMPTS) {
    updates.locked_until = new Date(Date.now() + LOCKOUT_MS).toISOString();
  }

  await service.from("profiles").update(updates).eq("id", profileId);
  return count;
}

export async function clearFailedLogins(profileId: string) {
  const service = await createServiceClient();
  await service
    .from("profiles")
    .update({ failed_login_count: 0, locked_until: null })
    .eq("id", profileId);
}
