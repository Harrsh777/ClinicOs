"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { checkMedicineAllergies } from "@/lib/prescriptions/allergy-check";
import { z } from "zod";

const itemSchema = z.object({
  medicineName: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1),
  instructions: z.string().optional(),
  allergyAcknowledged: z.boolean().optional(),
});

export async function checkAllergyAction(medicineName: string, patientId: string) {
  const supabase = await createClient();
  const { data: allergies } = await supabase
    .from("patient_allergies")
    .select("*")
    .eq("patient_id", patientId);
  const warnings = checkMedicineAllergies(medicineName, allergies ?? []);
  return { warnings };
}

export async function createPrescriptionAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const consultationId = formData.get("consultationId") as string;
  const patientId = formData.get("patientId") as string;
  const doctorId = formData.get("doctorId") as string;
  const itemsJson = formData.get("items") as string;

  let items: z.infer<typeof itemSchema>[];
  try {
    items = z.array(itemSchema).parse(JSON.parse(itemsJson));
  } catch {
    return { error: "Invalid prescription items" };
  }

  if (!items.length) return { error: "Add at least one medicine" };

  const supabase = await createClient();
  const { data: allergies } = await supabase
    .from("patient_allergies")
    .select("*")
    .eq("patient_id", patientId);

  for (const item of items) {
    const warnings = checkMedicineAllergies(item.medicineName, allergies ?? []);
    const severe = warnings.filter((w) => w.severity === "severe");
    if (severe.length > 0 && !item.allergyAcknowledged) {
      return {
        error: `Allergy warning: ${severe[0].message}. Acknowledge to proceed.`,
        allergyWarning: warnings,
      };
    }
  }

  const { data: rx, error } = await supabase
    .from("prescriptions")
    .insert({
      clinic_id: profile.clinic_id,
      consultation_id: consultationId,
      patient_id: patientId,
      doctor_id: doctorId,
      notes: (formData.get("notes") as string) || null,
    })
    .select()
    .single();

  if (error || !rx) return { error: error?.message ?? "Failed to create prescription" };

  const rows = items.map((item, i) => ({
    prescription_id: rx.id,
    medicine_name: item.medicineName,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions ?? null,
    allergy_acknowledged: item.allergyAcknowledged ?? false,
    sort_order: i,
  }));

  await supabase.from("prescription_items").insert(rows);

  revalidatePath(`/doctor/consultations/${consultationId}`);
  return { success: true, prescriptionId: rx.id };
}

export async function getPrescriptions(patientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prescriptions")
    .select("*, prescription_items(*), doctors(profiles(full_name))")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getPrescription(prescriptionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prescriptions")
    .select(`
      *,
      prescription_items(*),
      patients(full_name, phone, date_of_birth),
      doctors(profiles(full_name, specialization)),
      consultations(clinics(name, address, phone))
    `)
    .eq("id", prescriptionId)
    .single();
  return data;
}
