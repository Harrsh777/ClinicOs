"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { z } from "zod";

const patientSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  aadhaarLastFour: z.string().length(4).optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function createPatientAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const parsed = patientSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender"),
    bloodGroup: formData.get("bloodGroup"),
    address: formData.get("address"),
    emergencyContactName: formData.get("emergencyContactName"),
    emergencyContactPhone: formData.get("emergencyContactPhone"),
    aadhaarLastFour: formData.get("aadhaarLastFour"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: "Please fill required fields" };

  const supabase = await createClient();
  const count = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", profile.clinic_id);

  const patientCode = `P${String((count.count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: profile.clinic_id,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone.replace(/\D/g, ""),
      email: parsed.data.email || null,
      date_of_birth: parsed.data.dateOfBirth || null,
      gender: parsed.data.gender || null,
      blood_group: parsed.data.bloodGroup || null,
      address: parsed.data.address || null,
      emergency_contact_name: parsed.data.emergencyContactName || null,
      emergency_contact_phone: parsed.data.emergencyContactPhone || null,
      aadhaar_last_four: parsed.data.aadhaarLastFour || null,
      notes: parsed.data.notes || null,
      patient_code: patientCode,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from("audit_logs").insert({
    clinic_id: profile.clinic_id,
    actor_id: profile.id,
    action: "create",
    entity_type: "patient",
    entity_id: data.id,
  });

  revalidatePath("/receptionist/patients");
  revalidatePath("/doctor/patients");
  return { success: true, patientId: data.id };
}

const vitalsSchema = z.object({
  patientId: z.string().uuid(),
  heightCm: z.coerce.number().optional(),
  weightKg: z.coerce.number().optional(),
  temperatureC: z.coerce.number().optional(),
  bpSystolic: z.coerce.number().optional(),
  bpDiastolic: z.coerce.number().optional(),
  pulse: z.coerce.number().optional(),
  spo2: z.coerce.number().optional(),
  bloodSugar: z.coerce.number().optional(),
});

export async function recordVitalsAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const parsed = vitalsSchema.safeParse({
    patientId: formData.get("patientId"),
    heightCm: formData.get("heightCm") || undefined,
    weightKg: formData.get("weightKg") || undefined,
    temperatureC: formData.get("temperatureC") || undefined,
    bpSystolic: formData.get("bpSystolic") || undefined,
    bpDiastolic: formData.get("bpDiastolic") || undefined,
    pulse: formData.get("pulse") || undefined,
    spo2: formData.get("spo2") || undefined,
    bloodSugar: formData.get("bloodSugar") || undefined,
  });

  if (!parsed.success) return { error: "Invalid vitals data" };

  const supabase = await createClient();
  const { error } = await supabase.from("patient_vitals").insert({
    patient_id: parsed.data.patientId,
    clinic_id: profile.clinic_id,
    recorded_by: profile.id,
    height_cm: parsed.data.heightCm,
    weight_kg: parsed.data.weightKg,
    temperature_c: parsed.data.temperatureC,
    bp_systolic: parsed.data.bpSystolic,
    bp_diastolic: parsed.data.bpDiastolic,
    pulse: parsed.data.pulse,
    spo2: parsed.data.spo2,
    blood_sugar: parsed.data.bloodSugar,
  });

  if (error) return { error: error.message };
  revalidatePath(`/receptionist/patients/${parsed.data.patientId}`);
  return { success: true };
}

export async function addAllergyAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { error } = await supabase.from("patient_allergies").insert({
    patient_id: formData.get("patientId") as string,
    clinic_id: profile.clinic_id,
    allergen: formData.get("allergen") as string,
    severity: (formData.get("severity") as string) || "moderate",
    reaction: (formData.get("reaction") as string) || null,
    created_by: profile.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/receptionist/patients/${formData.get("patientId")}`);
  return { success: true };
}

export async function getPatients(clinicId: string, search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getPatientDetail(patientId: string) {
  const supabase = await createClient();
  const [patient, vitals, allergies, history, documents] = await Promise.all([
    supabase.from("patients").select("*").eq("id", patientId).single(),
    supabase.from("patient_vitals").select("*").eq("patient_id", patientId).order("recorded_at"),
    supabase.from("patient_allergies").select("*").eq("patient_id", patientId),
    supabase.from("patient_medical_history").select("*").eq("patient_id", patientId).maybeSingle(),
    supabase.from("patient_documents").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
  ]);

  return {
    patient: patient.data,
    vitals: vitals.data ?? [],
    allergies: allergies.data ?? [],
    history: history.data,
    documents: documents.data ?? [],
  };
}
