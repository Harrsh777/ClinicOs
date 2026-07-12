import type { createServiceClient } from "@/lib/supabase/server";
import { generatePatientCode } from "@/lib/db/sequences";

export function normalizePatientPhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export interface PortalPatientInput {
  fullName: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  bloodGroup?: string;
  address?: string;
  symptoms?: string;
  medicalConditions?: string;
  allergies?: string;
  currentMedicines?: string;
  occupation?: string;
  insurance?: string;
  notes?: string;
}

export interface UpsertPatientResult {
  patientId: string;
  patientCode: string;
  isReturning: boolean;
  created: boolean;
}

export async function upsertPortalPatientFull(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  clinicId: string,
  input: PortalPatientInput
): Promise<UpsertPatientResult> {
  const phone = normalizePatientPhone(input.phone);
  const email = input.email?.trim().toLowerCase() || null;

  let existing: { id: string; patient_code: string | null; visit_count: number } | null = null;

  const { data: byPhone } = await service
    .from("patients")
    .select("id, patient_code, visit_count, email")
    .eq("clinic_id", clinicId)
    .eq("phone", phone)
    .eq("is_active", true)
    .maybeSingle();

  existing = byPhone;

  if (!existing && email) {
    const { data: byEmail } = await service
      .from("patients")
      .select("id, patient_code, visit_count, email")
      .eq("clinic_id", clinicId)
      .ilike("email", email)
      .eq("is_active", true)
      .maybeSingle();
    existing = byEmail;
  }

  const dateOfBirth =
    input.age && input.age > 0
      ? `${new Date().getFullYear() - input.age}-01-01`
      : null;

  if (existing) {
    await service
      .from("patients")
      .update({
        full_name: input.fullName,
        email: email ?? undefined,
        gender: input.gender || null,
        blood_group: input.bloodGroup || null,
        address: input.address || null,
        occupation: input.occupation || null,
        insurance_info: input.insurance || null,
        notes: input.notes || null,
        is_returning: true,
        date_of_birth: dateOfBirth,
      })
      .eq("id", existing.id);

    if (input.medicalConditions) {
      await service.from("patient_medical_history").upsert(
        {
          patient_id: existing.id,
          clinic_id: clinicId,
          chronic_conditions: input.medicalConditions,
        },
        { onConflict: "patient_id" }
      );
    }

    if (input.allergies) {
      const allergens = input.allergies.split(",").map((a) => a.trim()).filter(Boolean);
      for (const allergen of allergens) {
        const { data: existingAllergy } = await service
          .from("patient_allergies")
          .select("id")
          .eq("patient_id", existing.id)
          .ilike("allergen", allergen)
          .maybeSingle();
        if (!existingAllergy) {
          await service.from("patient_allergies").insert({
            patient_id: existing.id,
            clinic_id: clinicId,
            allergen,
            severity: "moderate",
          });
        }
      }
    }

    if (input.heightCm || input.weightKg) {
      await service.from("patient_vitals").insert({
        patient_id: existing.id,
        clinic_id: clinicId,
        height_cm: input.heightCm ?? null,
        weight_kg: input.weightKg ?? null,
      });
    }

    return {
      patientId: existing.id,
      patientCode: existing.patient_code ?? "",
      isReturning: true,
      created: false,
    };
  }

  const patientCode = await generatePatientCode(service, clinicId);

  const { data: created, error } = await service
    .from("patients")
    .insert({
      clinic_id: clinicId,
      full_name: input.fullName,
      phone,
      email,
      patient_code: patientCode,
      gender: input.gender || null,
      blood_group: input.bloodGroup || null,
      address: input.address || null,
      occupation: input.occupation || null,
      insurance_info: input.insurance || null,
      notes: input.notes || null,
      date_of_birth: dateOfBirth,
      is_returning: false,
      visit_count: 0,
    })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Failed to create patient");

  if (input.medicalConditions) {
    await service.from("patient_medical_history").insert({
      patient_id: created.id,
      clinic_id: clinicId,
      chronic_conditions: input.medicalConditions,
    });
  }

  if (input.allergies) {
    const allergens = input.allergies.split(",").map((a) => a.trim()).filter(Boolean);
    for (const allergen of allergens) {
      await service.from("patient_allergies").insert({
        patient_id: created.id,
        clinic_id: clinicId,
        allergen,
        severity: "moderate",
      });
    }
  }

  if (input.heightCm || input.weightKg) {
    await service.from("patient_vitals").insert({
      patient_id: created.id,
      clinic_id: clinicId,
      height_cm: input.heightCm ?? null,
      weight_kg: input.weightKg ?? null,
    });
  }

  return {
    patientId: created.id,
    patientCode,
    isReturning: false,
    created: true,
  };
}

const LOOKUP_SELECT =
  "id, full_name, patient_code, email, gender, blood_group, is_returning, visit_count, address, occupation, insurance_info, date_of_birth, notes";

async function enrichLookupPatient(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  patient: Record<string, unknown>
) {
  const patientId = patient.id as string;
  const [{ data: history }, { data: allergies }] = await Promise.all([
    service
      .from("patient_medical_history")
      .select("chronic_conditions")
      .eq("patient_id", patientId)
      .maybeSingle(),
    service.from("patient_allergies").select("allergen").eq("patient_id", patientId),
  ]);

  const dob = patient.date_of_birth as string | null;
  const age =
    dob && !Number.isNaN(Date.parse(dob))
      ? Math.max(0, new Date().getFullYear() - new Date(dob).getFullYear())
      : null;

  return {
    ...patient,
    age,
    medical_conditions: history?.chronic_conditions ?? null,
    allergies: allergies?.map((a) => a.allergen).join(", ") || null,
    insurance: (patient.insurance_info as string | null) ?? null,
  };
}

export async function lookupPortalPatient(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  clinicId: string,
  phone: string,
  email?: string
) {
  const normalized = normalizePatientPhone(phone);

  const { data: byPhone } = await service
    .from("patients")
    .select(LOOKUP_SELECT)
    .eq("clinic_id", clinicId)
    .eq("phone", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (byPhone) {
    return {
      found: true as const,
      patient: await enrichLookupPatient(service, byPhone),
      matchType: "phone" as const,
    };
  }

  if (email?.trim()) {
    const { data: byEmail } = await service
      .from("patients")
      .select(LOOKUP_SELECT)
      .eq("clinic_id", clinicId)
      .ilike("email", email.trim().toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (byEmail) {
      return {
        found: true as const,
        patient: await enrichLookupPatient(service, byEmail),
        matchType: "email" as const,
      };
    }
  }

  return { found: false as const };
}
