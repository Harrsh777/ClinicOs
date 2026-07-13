import { createClient } from "@/lib/supabase/server";

export interface LinkedDoctor {
  id: string;
  specialization: string | null;
  consultation_fee: number | null;
}

/** Returns the doctor record linked to a profile (owner who also practices). */
export async function getLinkedDoctor(profileId: string): Promise<LinkedDoctor | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("doctors")
    .select("id, specialization, consultation_fee")
    .eq("profile_id", profileId)
    .maybeSingle();

  return data;
}

export function getConsultationsBasePath(role: string): string {
  return role === "clinic_owner" ? "/owner/consultations" : "/doctor/consultations";
}
