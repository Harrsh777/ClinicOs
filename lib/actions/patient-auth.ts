"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  findPatientByPhone,
  normalizePatientPhone,
  patientAuthEmail,
  resolvePatientLoginEmail,
} from "@/lib/auth/patient-login";
import { resolveClinicFromCode } from "@/lib/auth/clinic-login";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { requirePortalSession } from "@/lib/portal/session";
import { logAuditEvent } from "@/lib/auth/audit";
import { ROLE_ROUTES } from "@/lib/types/database";
import { z } from "zod";

const registerSchema = z.object({
  clinicSlug: z.string().min(1),
  phone: z.string().min(10),
  fullName: z.string().min(2),
  password: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
});

const loginSchema = z.object({
  clinicSlug: z.string().min(1),
  phone: z.string().min(10),
  password: z.string().min(6),
});

async function upsertPatientRecord(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  clinicId: string,
  fullName: string,
  phone: string,
  email?: string | null
) {
  const normalized = normalizePatientPhone(phone);
  const existing = await findPatientByPhone(clinicId, normalized);

  if (existing) {
    await service
      .from("patients")
      .update({
        full_name: fullName,
        ...(email ? { email } : {}),
      })
      .eq("id", existing.id);
    return existing;
  }

  const { count } = await service
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId);

  const patientCode = `P${String((count ?? 0) + 1).padStart(4, "0")}`;
  const { data, error } = await service
    .from("patients")
    .insert({
      clinic_id: clinicId,
      full_name: fullName,
      phone: normalized,
      patient_code: patientCode,
      email: email || null,
    })
    .select("id, user_id")
    .single();

  if (error) throw new Error(error.message);
  return { ...data, full_name: fullName, phone: normalized, email, clinic_id: clinicId, user_id: data.user_id };
}

export async function registerPatientAccountAction(input: {
  clinicSlug: string;
  phone: string;
  fullName: string;
  password: string;
  email?: string;
}) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid registration details." };

  const clinic = await getPublicClinicBySlug(parsed.data.clinicSlug);
  if (!clinic) return { error: "Clinic not found." };

  const phone = normalizePatientPhone(parsed.data.phone);
  const sessionCheck = await requirePortalSession(phone, clinic.id);
  if (sessionCheck.error) return { error: sessionCheck.error };

  const service = await createServiceClient();
  const patient = await upsertPatientRecord(
    service,
    clinic.id,
    parsed.data.fullName,
    phone,
    parsed.data.email || null
  );

  if (patient.user_id) {
    return { error: "An account already exists for this number. Please sign in instead." };
  }

  const { data: clinicRow } = await service
    .from("clinics")
    .select("clinic_code")
    .eq("id", clinic.id)
    .single();

  const authEmail = patientAuthEmail(phone, clinicRow?.clinic_code ?? clinic.slug);
  const optionalEmail = parsed.data.email?.trim() || null;

  const { data: authUser, error: createError } = await service.auth.admin.createUser({
    email: authEmail,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: "patient" },
  });

  if (createError || !authUser.user) {
    return { error: createError?.message ?? "Could not create account." };
  }

  await service
    .from("profiles")
    .update({
      role: "patient",
      clinic_id: clinic.id,
      full_name: parsed.data.fullName,
      phone,
      email: authEmail,
    })
    .eq("id", authUser.user.id);

  await service
    .from("patients")
    .update({
      user_id: authUser.user.id,
      ...(optionalEmail ? { email: optionalEmail } : {}),
    })
    .eq("id", patient.id);

  await logAuditEvent({
    clinicId: clinic.id,
    actorId: authUser.user.id,
    action: "patient.registered",
    entityType: "patient",
    entityId: patient.id,
  });

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: parsed.data.password,
  });

  if (signInError) {
    return { success: true, requiresLogin: true };
  }

  redirect("/patient");
}

export async function patientPortalLoginAction(input: {
  clinicSlug: string;
  phone: string;
  password: string;
}) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid login details." };

  const clinic = await getPublicClinicBySlug(parsed.data.clinicSlug);
  if (!clinic) return { error: "Clinic not found." };

  const service = await createServiceClient();
  const { data: clinicRow } = await service
    .from("clinics")
    .select("clinic_code, status")
    .eq("id", clinic.id)
    .single();

  if (clinicRow?.status === "suspended") {
    return { error: "This clinic has been suspended." };
  }

  const phone = normalizePatientPhone(parsed.data.phone);
  const authEmail = patientAuthEmail(phone, clinicRow?.clinic_code ?? clinic.slug);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: parsed.data.password,
  });

  if (error) return { error: "Invalid phone number or password." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication failed." };

  const { data: profile } = await service
    .from("profiles")
    .select("role, clinic_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "patient" || profile.clinic_id !== clinic.id) {
    await supabase.auth.signOut();
    return { error: "This account is not registered with this clinic." };
  }

  const hdrs = await headers();
  await service.from("user_sessions").insert({
    profile_id: user.id,
    clinic_id: clinic.id,
    session_token: crypto.randomUUID(),
    ip_address: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: hdrs.get("user-agent"),
    device_label: "Patient portal",
  });

  redirect("/patient");
}

export async function patientOtpLoginAction(clinicSlug: string, phone: string) {
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) return { error: "Clinic not found." };

  const normalized = normalizePatientPhone(phone);
  const sessionCheck = await requirePortalSession(normalized, clinic.id);
  if (sessionCheck.error) return { error: sessionCheck.error };

  const patient = await findPatientByPhone(clinic.id, normalized);
  if (!patient?.user_id) {
    return { error: "no_account", message: "No account linked yet. Create one to continue." };
  }

  const service = await createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("email, role, clinic_id, is_active")
    .eq("id", patient.user_id)
    .single();

  if (!profile?.email || profile.role !== "patient") {
    return { error: "Account configuration error. Contact your clinic." };
  }
  if (profile.is_active === false) {
    return { error: "Your account has been deactivated." };
  }
  if (profile.clinic_id !== clinic.id) {
    return { error: "Account clinic mismatch." };
  }

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
  });

  if (linkError || !linkData.properties?.hashed_token) {
    return { error: "Could not start session. Try password login." };
  }

  return { success: true, tokenHash: linkData.properties.hashed_token };
}

export async function patientClinicLoginAction(formData: FormData) {
  const clinicId = String(formData.get("clinicId") ?? "").trim().toUpperCase();
  const phone = String(formData.get("phone") ?? formData.get("staffId") ?? "");
  const password = String(formData.get("password") ?? "");

  const resolved = await resolvePatientLoginEmail(clinicId, phone);
  if (!resolved.ok) return { error: resolved.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: resolved.email,
    password,
  });

  if (error) return { error: "Invalid phone number or password." };

  const clinic = await resolveClinicFromCode(clinicId);
  const service = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && clinic) {
    const hdrs = await headers();
    await service.from("user_sessions").insert({
      profile_id: user.id,
      clinic_id: clinic.id,
      session_token: crypto.randomUUID(),
      ip_address: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: hdrs.get("user-agent"),
      device_label: "Patient login",
    });

    await logAuditEvent({
      clinicId: clinic.id,
      actorId: user.id,
      action: "patient.login",
      entityType: "patient",
      entityId: resolved.patientId,
    });
  }

  redirect(ROLE_ROUTES.patient);
}

export async function getPatientAccountStatus(clinicSlug: string, phone: string) {
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) return { hasAccount: false };

  const patient = await findPatientByPhone(clinic.id, phone);
  return { hasAccount: Boolean(patient?.user_id), patientId: patient?.id ?? null };
}
