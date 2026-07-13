"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { checkMedicineAllergies } from "@/lib/prescriptions/allergy-check";
import {
  buildPrescriptionEmailHtml,
  buildPrescriptionShareMessage,
} from "@/lib/prescriptions/format-message";
import { notifyPrescriptionReady } from "@/lib/notifications/service";
import { sendEmail } from "@/lib/email/send";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { z } from "zod";

const itemSchema = z.object({
  medicineName: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1),
  instructions: z.string().optional(),
  allergyAcknowledged: z.boolean().optional(),
});

export type PrescriptionStatus = "draft" | "finalized" | "dispensed";

export interface ClinicPrescriptionFilters {
  dateFrom?: string;
  dateTo?: string;
  doctorId?: string;
  patientId?: string;
  status?: PrescriptionStatus;
  limit?: number;
}

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

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

  const names = items.map((i) => i.medicineName.trim().toLowerCase());
  if (new Set(names).size !== names.length) {
    return { error: "Duplicate medicines detected. Remove duplicates before saving." };
  }

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
      status: "finalized",
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

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", patientId)
    .single();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("profile_id, profiles(full_name)")
    .eq("id", doctorId)
    .single();

  const doctorProfileRaw = doctor?.profiles;
  const doctorProfile = Array.isArray(doctorProfileRaw)
    ? doctorProfileRaw[0]
    : doctorProfileRaw;

  await notifyPrescriptionReady({
    clinicId: profile.clinic_id,
    patientId,
    doctorProfileId: doctor?.profile_id ?? profile.id,
    patientName: patient?.full_name ?? "Patient",
    doctorName: doctorProfile?.full_name ?? "Doctor",
    prescriptionId: rx.id,
  });

  revalidatePath(`/doctor/consultations/${consultationId}`);
  revalidatePath(`/owner/consultations/${consultationId}`);
  revalidatePath("/owner/prescriptions");
  revalidatePath("/doctor/prescriptions");
  return { success: true, prescriptionId: rx.id };
}

export async function getClinicPrescriptions(
  clinicId: string,
  filters?: ClinicPrescriptionFilters
) {
  const supabase = await createClient();
  let query = supabase
    .from("prescriptions")
    .select(`
      *,
      patients(full_name, phone),
      doctors(profiles(full_name)),
      prescription_items(id, medicine_name, dosage, frequency, duration, instructions, allergy_acknowledged)
    `)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (filters?.dateFrom) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
  }
  if (filters?.dateTo) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59`);
  }
  if (filters?.doctorId) query = query.eq("doctor_id", filters.doctorId);
  if (filters?.patientId) query = query.eq("patient_id", filters.patientId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data } = await query;
  return data ?? [];
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
      patients(full_name, phone, date_of_birth, email),
      doctors(profiles(full_name, specialization)),
      consultations(id, clinics(name, address, phone, prescription_header, digital_signature_url))
    `)
    .eq("id", prescriptionId)
    .single();
  return data;
}

export async function getPrescriptionDispenseStatus(prescriptionId: string) {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("prescription_items")
    .select("id")
    .eq("prescription_id", prescriptionId);

  if (!items?.length) return { total: 0, dispensed: 0 };

  const itemIds = items.map((i) => i.id);
  const { data: dispensed } = await supabase
    .from("pharmacy_dispense")
    .select("prescription_item_id")
    .in("prescription_item_id", itemIds);

  const dispensedIds = new Set((dispensed ?? []).map((d) => d.prescription_item_id));
  return { total: items.length, dispensed: dispensedIds.size, dispensedIds };
}

export async function sharePrescriptionWhatsAppAction(prescriptionId: string) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const rx = await getPrescription(prescriptionId);
  if (!rx || rx.clinic_id !== profile.clinic_id) return { error: "Prescription not found" };

  const patient = rx.patients as { full_name: string; phone: string };
  const doctor = rx.doctors as { profiles: { full_name: string } };
  const clinic = (rx.consultations as { clinics: { name: string } })?.clinics;
  const items = (rx.prescription_items ?? []) as {
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
  }[];

  const printUrl = `${appBaseUrl()}/print/prescription/${prescriptionId}`;
  const message = buildPrescriptionShareMessage({
    patientName: patient.full_name,
    doctorName: doctor.profiles.full_name,
    clinicName: clinic?.name ?? "Clinic",
    items,
    notes: rx.notes,
    printUrl,
  });

  const result = await sendWhatsAppMessage({
    clinicId: profile.clinic_id,
    patientId: rx.patient_id,
    patientPhone: patient.phone,
    content: message,
    intent: "prescription_ready",
    metadata: { prescription_id: prescriptionId, sentBy: profile.id },
    senderProfileId: profile.id,
    senderType: "staff",
  });

  if (!result.success && !result.simulated) {
    return { error: result.error ?? "WhatsApp delivery failed" };
  }

  const service = await createServiceClient();
  await service
    .from("prescriptions")
    .update({ shared_at: new Date().toISOString() })
    .eq("id", prescriptionId);

  revalidatePath("/owner/prescriptions");
  revalidatePath(`/owner/prescriptions/${prescriptionId}`);
  return { success: true, simulated: result.simulated };
}

export async function sharePrescriptionEmailAction(prescriptionId: string) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const rx = await getPrescription(prescriptionId);
  if (!rx || rx.clinic_id !== profile.clinic_id) return { error: "Prescription not found" };

  const patient = rx.patients as { full_name: string; email?: string | null };
  if (!patient.email) return { error: "Patient has no email on file" };

  const doctor = rx.doctors as { profiles: { full_name: string } };
  const clinic = (rx.consultations as { clinics: { name: string } })?.clinics;
  const items = (rx.prescription_items ?? []) as {
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
  }[];

  const printUrl = `${appBaseUrl()}/print/prescription/${prescriptionId}`;
  const html = buildPrescriptionEmailHtml({
    patientName: patient.full_name,
    doctorName: doctor.profiles.full_name,
    clinicName: clinic?.name ?? "Clinic",
    items,
    notes: rx.notes,
    printUrl,
  });

  const result = await sendEmail({
    to: patient.email,
    subject: `Your prescription from ${clinic?.name ?? "Clinic"}`,
    html,
  });

  if (!result.ok) return { error: result.error };

  const service = await createServiceClient();
  await service
    .from("prescriptions")
    .update({ shared_at: new Date().toISOString() })
    .eq("id", prescriptionId);

  revalidatePath(`/owner/prescriptions/${prescriptionId}`);
  return { success: true };
}
