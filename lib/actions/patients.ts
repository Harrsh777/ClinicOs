"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/auth/audit";
import { generatePatientCode } from "@/lib/db/sequences";
import { createServiceClient } from "@/lib/supabase/server";
import { validateIndianPhone } from "@/lib/validations/phone";
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

  const phoneResult = validateIndianPhone(parsed.data.phone);
  if ("error" in phoneResult) return { error: phoneResult.error };

  const supabase = await createClient();
  const service = await createServiceClient();
  const patientCode = await generatePatientCode(service, profile.clinic_id);

  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: profile.clinic_id,
      full_name: parsed.data.fullName,
      phone: phoneResult.phone,
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

  if (error) {
    if (error.code === "23505") {
      return { error: "A patient with this phone number already exists at this clinic" };
    }
    return { error: error.message };
  }

  await logAuditEvent({
    clinicId: profile.clinic_id,
    actorId: profile.id,
    action: "create",
    entityType: "patient",
    entityId: data.id,
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
  revalidatePath(`/owner/patients/${parsed.data.patientId}`);
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
  const patientId = formData.get("patientId") as string;
  revalidatePath(`/owner/patients/${patientId}`);
  revalidatePath(`/receptionist/patients/${patientId}`);
  return { success: true };
}

export async function searchPatientsAction(clinicId: string, query: string) {
  await requireAuth();
  return getPatients(clinicId, query);
}

export async function resolveOrCreateClinicPatient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicId: string,
  actorId: string,
  input: { fullName: string; phone: string; gender?: string | null }
) {
  const phone = input.phone.replace(/\D/g, "");

  const { data: existing } = await supabase
    .from("patients")
    .select("id, patient_code")
    .eq("clinic_id", clinicId)
    .eq("phone", phone)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    return {
      patientId: existing.id,
      patientCode: existing.patient_code as string | null,
      isExisting: true,
    };
  }

  const service = await createServiceClient();
  const patientCode = await generatePatientCode(service, clinicId);

  const { data: newPatient, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: clinicId,
      full_name: input.fullName.trim(),
      phone,
      gender: input.gender || null,
      patient_code: patientCode,
      created_by: actorId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logAuditEvent({
    clinicId,
    actorId,
    action: "create",
    entityType: "patient",
    entityId: newPatient.id,
  });

  return { patientId: newPatient.id, patientCode, isExisting: false };
}

export async function updatePatientAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const patientId = formData.get("patientId") as string;
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
  const { error } = await supabase
    .from("patients")
    .update({
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
    })
    .eq("id", patientId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };

  revalidatePath(`/owner/patients/${patientId}`);
  revalidatePath(`/receptionist/patients/${patientId}`);
  return { success: true };
}

const historySchema = z.object({
  patientId: z.string().uuid(),
  illnesses: z.string().optional(),
  surgeries: z.string().optional(),
  familyHistory: z.string().optional(),
  smokingStatus: z.string().optional(),
  alcoholStatus: z.string().optional(),
  chronicConditions: z.string().optional(),
  notes: z.string().optional(),
});

export async function upsertMedicalHistoryAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const parsed = historySchema.safeParse({
    patientId: formData.get("patientId"),
    illnesses: formData.get("illnesses") || undefined,
    surgeries: formData.get("surgeries") || undefined,
    familyHistory: formData.get("familyHistory") || undefined,
    smokingStatus: formData.get("smokingStatus") || undefined,
    alcoholStatus: formData.get("alcoholStatus") || undefined,
    chronicConditions: formData.get("chronicConditions") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: "Invalid data" };

  const supabase = await createClient();
  const { error } = await supabase.from("patient_medical_history").upsert(
    {
      patient_id: parsed.data.patientId,
      clinic_id: profile.clinic_id,
      illnesses: parsed.data.illnesses || null,
      surgeries: parsed.data.surgeries || null,
      family_history: parsed.data.familyHistory || null,
      smoking_status: parsed.data.smokingStatus || null,
      alcohol_status: parsed.data.alcoholStatus || null,
      chronic_conditions: parsed.data.chronicConditions || null,
      notes: parsed.data.notes || null,
      updated_by: profile.id,
    },
    { onConflict: "patient_id" }
  );

  if (error) return { error: error.message };
  revalidatePath(`/owner/patients/${parsed.data.patientId}`);
  revalidatePath(`/receptionist/patients/${parsed.data.patientId}`);
  return { success: true };
}

export async function uploadPatientDocumentAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const patientId = formData.get("patientId") as string;
  const name = formData.get("name") as string;
  const documentType = (formData.get("documentType") as string) || "other";
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) return { error: "No file selected" };

  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const storagePath = `${profile.clinic_id}/patients/${patientId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("clinical-documents")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("patient_documents").insert({
    patient_id: patientId,
    clinic_id: profile.clinic_id,
    name: name || file.name,
    document_type: documentType,
    storage_path: storagePath,
    uploaded_by: profile.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/owner/patients/${patientId}`);
  revalidatePath(`/receptionist/patients/${patientId}`);
  return { success: true };
}

export async function deleteVitalAction(vitalId: string, patientId: string) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("patient_vitals")
    .delete()
    .eq("id", vitalId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };
  revalidatePath(`/owner/patients/${patientId}`);
  revalidatePath(`/receptionist/patients/${patientId}`);
  return { success: true };
}

export async function deleteAllergyAction(allergyId: string, patientId: string) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("patient_allergies")
    .delete()
    .eq("id", allergyId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };
  revalidatePath(`/owner/patients/${patientId}`);
  revalidatePath(`/receptionist/patients/${patientId}`);
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
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,patient_code.ilike.%${search}%`);
  }

  const { data } = await query;
  return data ?? [];
}

export type PatientDoctorNote = {
  note: string;
  notedAt: string;
  doctorName?: string;
  consultationId?: string;
  inProgress?: boolean;
};

function formatDoctorNote(
  notes: {
    diagnosis?: string | null;
    symptoms?: string | null;
    clinical_notes?: string | null;
  } | null | undefined
): string | null {
  if (!notes) return null;
  return notes.diagnosis?.trim() || notes.symptoms?.trim() || notes.clinical_notes?.trim() || null;
}

/** Latest saved doctor note per patient (in-progress consult notes or completed EMR). */
export async function getPatientDoctorNotesMap(
  clinicId: string,
  patientIds: string[]
): Promise<Record<string, PatientDoctorNote>> {
  if (patientIds.length === 0) return {};

  const supabase = await createClient();
  const result: Record<string, PatientDoctorNote> = {};

  const { data: consultations } = await supabase
    .from("consultations")
    .select(`
      id,
      patient_id,
      status,
      started_at,
      consultation_notes(diagnosis, symptoms, clinical_notes),
      doctors(profiles(full_name))
    `)
    .eq("clinic_id", clinicId)
    .in("patient_id", patientIds)
    .order("started_at", { ascending: false });

  for (const row of consultations ?? []) {
    if (result[row.patient_id]) continue;
    const rawNotes = row.consultation_notes;
    const noteRow = Array.isArray(rawNotes) ? rawNotes[0] : rawNotes;
    const note = formatDoctorNote(noteRow);
    if (!note) continue;

    const profiles = (row.doctors as { profiles?: { full_name: string } | { full_name: string }[] })?.profiles;
    const doctorName = Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name;

    result[row.patient_id] = {
      note,
      notedAt: row.started_at,
      doctorName: doctorName ?? undefined,
      consultationId: row.id,
      inProgress: row.status === "in_progress",
    };
  }

  const missingIds = patientIds.filter((id) => !result[id]);
  if (missingIds.length === 0) return result;

  const { data: emrRows } = await supabase
    .from("emr_records")
    .select("patient_id, created_at, summary")
    .eq("clinic_id", clinicId)
    .in("patient_id", missingIds)
    .order("created_at", { ascending: false });

  for (const row of emrRows ?? []) {
    if (result[row.patient_id]) continue;
    const summary = (row.summary ?? {}) as {
      diagnosis?: string;
      symptoms?: string;
      clinical_notes?: string;
      doctor?: string;
    };
    const note = summary.diagnosis?.trim() || summary.symptoms?.trim() || summary.clinical_notes?.trim();
    if (!note) continue;
    result[row.patient_id] = {
      note,
      notedAt: row.created_at,
      doctorName: summary.doctor,
    };
  }

  return result;
}

export async function getPatientsWithDoctorNotes(clinicId: string, search?: string) {
  const patients = await getPatients(clinicId, search);
  const notesMap = await getPatientDoctorNotesMap(
    clinicId,
    patients.map((p) => p.id)
  );

  return patients.map((p) => ({
    ...p,
    doctor_note: notesMap[p.id]?.note ?? null,
    doctor_note_at: notesMap[p.id]?.notedAt ?? null,
    doctor_name: notesMap[p.id]?.doctorName ?? null,
    in_progress_consultation_id: notesMap[p.id]?.inProgress ? notesMap[p.id]?.consultationId : null,
  }));
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

export async function getPatientSummary(patientId: string, clinicId: string) {
  const supabase = await createClient();

  const [
    { data: patient },
    { data: appointments },
    { data: prescriptions },
    { data: emrRecords },
    { data: bills },
    { data: documents },
  ] = await Promise.all([
    supabase.from("patients").select("*").eq("id", patientId).eq("clinic_id", clinicId).single(),
    supabase
      .from("appointments")
      .select("id, appointment_date, appointment_time, status, consultation_type, appointment_number, booking_symptoms, booking_notes, doctors(profiles(full_name))")
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: false })
      .limit(10),
    supabase
      .from("prescriptions")
      .select("id, created_at, doctors(profiles(full_name))")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("emr_records")
      .select("id, visit_number, created_at, summary")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("bills")
      .select("id, invoice_number, total_amount, paid_amount, status, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("patient_documents")
      .select("id, name, document_type, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!patient) return null;

  return {
    patient,
    appointments: appointments ?? [],
    prescriptions: prescriptions ?? [],
    emrRecords: emrRecords ?? [],
    bills: bills ?? [],
    documents: documents ?? [],
  };
}
