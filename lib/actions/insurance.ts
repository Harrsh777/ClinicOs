"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

export async function getInsurancePolicies(patientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("insurance_policies")
    .select("*")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("expiry_date");
  return data ?? [];
}

export async function createInsurancePolicyAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const expiryDate = formData.get("expiryDate") as string;
  const { error } = await supabase.from("insurance_policies").insert({
    clinic_id: profile.clinic_id,
    patient_id: formData.get("patientId") as string,
    company: formData.get("company") as string,
    policy_number: formData.get("policyNumber") as string,
    member_id: (formData.get("memberId") as string) || null,
    coverage_percent: parseFloat(formData.get("coveragePercent") as string) || 80,
    expiry_date: expiryDate,
    notes: (formData.get("notes") as string) || null,
  });

  if (error) return { error: error.message };

  const daysUntilExpiry = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntilExpiry <= 30) {
    await supabase.from("inventory_alerts").insert({
      clinic_id: profile.clinic_id,
      policy_id: null,
      alert_type: "insurance_expiry",
      message: `Insurance policy ${formData.get("policyNumber")} expires in ${daysUntilExpiry} days`,
    });
  }

  revalidatePath("/receptionist/insurance");
  return { success: true };
}

export async function getInsuranceClaims(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("insurance_claims")
    .select("*, insurance_policies(company, policy_number), patients(full_name), bills(invoice_number)")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function updateClaimStatusAction(claimId: string, status: string, approvedAmount?: number) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const update: Record<string, unknown> = { status };
  if (status === "submitted") update.submitted_at = new Date().toISOString();
  if (approvedAmount !== undefined) update.approved_amount = approvedAmount;

  const { error } = await supabase
    .from("insurance_claims")
    .update(update)
    .eq("id", claimId);

  if (error) return { error: error.message };
  revalidatePath("/receptionist/insurance");
  return { success: true };
}

export async function getExpiringPolicies(clinicId: string) {
  const supabase = await createClient();
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const { data } = await supabase
    .from("insurance_policies")
    .select("*, patients(full_name)")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .lte("expiry_date", in30Days.toISOString().split("T")[0])
    .order("expiry_date");
  return data ?? [];
}
