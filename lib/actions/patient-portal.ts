"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

async function getLinkedPatientId() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();
  return patient?.id ?? null;
}

export async function getPatientFollowUps(patientId?: string) {
  const id = patientId ?? (await getLinkedPatientId());
  if (!id) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("follow_up_tasks")
    .select("*, prescriptions(id, prescribed_at, doctors(profiles(full_name)))")
    .eq("patient_id", id)
    .order("scheduled_at", { ascending: true });

  return data ?? [];
}

export async function respondToFollowUpAction(taskId: string, response: string) {
  const patientId = await getLinkedPatientId();
  if (!patientId) return { error: "Patient record not linked." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_up_tasks")
    .update({
      response,
      responded_at: new Date().toISOString(),
      status: "responded",
    })
    .eq("id", taskId)
    .eq("patient_id", patientId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getPatientPharmacyOrders(patientId?: string) {
  const id = patientId ?? (await getLinkedPatientId());
  if (!id) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("pharmacy_dispense")
    .select("*, pharmacy_medicines!pharmacy_dispense_medicine_id_fkey(name, generic_name, unit)")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  return data ?? [];
}
