import type { Profile } from "@/lib/types/database";

export const MIDDLEWARE_PROFILE_HEADER = "x-clinic-profile";
export const MIDDLEWARE_SETUP_HEADER = "x-clinic-setup-done";

export function encodeMiddlewareProfile(profile: Profile): string {
  return btoa(encodeURIComponent(JSON.stringify(profile)));
}

export function decodeMiddlewareProfile(encoded: string): Profile | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as Profile;
  } catch {
    return null;
  }
}
