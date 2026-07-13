import { createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { createActivationToken } from "@/lib/auth/activation";
import { enrichDoctorFromOnboarding } from "@/lib/clinic/doctor-setup";
import { savePlatformClinicCredentials } from "@/lib/clinic/credentials";
import { initializeClinicModules } from "@/lib/clinic/modules";
import type { UserRole } from "@/lib/types/database";

const ASSIGNABLE_STAFF_ROLES: UserRole[] = [
  "doctor",
  "receptionist",
  "finance_manager",
  "nurse",
  "pharmacist",
  "lab_technician",
  "hr",
  "administrator",
];

function randomPassword(length = 32) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) out += chars[bytes[i]! % chars.length];
  return out;
}

export async function generateClinicCode(): Promise<string> {
  const service = await createServiceClient();
  const { data: seqData, error: seqError } = await service.rpc("generate_sequential_clinic_code");
  if (!seqError && seqData) return seqData as string;

  const { data, error } = await service.rpc("generate_clinic_code");
  if (!error && data) return data as string;
  return `CLN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

async function generateStaffCode(clinicId: string, role: UserRole): Promise<string> {
  const service = await createServiceClient();
  const { data, error } = await service.rpc("generate_staff_code", {
    p_clinic_id: clinicId,
    p_role: role,
  });
  if (!error && data) return data as string;
  const prefix = role === "clinic_owner" ? "OWN" : "STF";
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

export async function createClinicWithOwner(params: {
  name: string;
  ownerEmail: string;
  ownerName: string;
  planId: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  email?: string;
  clinicType?: string;
}) {
  const service = await createServiceClient();
  const clinicCode = await generateClinicCode();
  const slug = slugify(params.name) + "-" + Date.now().toString(36);

  const { data: clinic, error: clinicError } = await service
    .from("clinics")
    .insert({
      name: params.name,
      slug,
      clinic_code: clinicCode,
      phone: params.phone,
      address: params.address,
      city: params.city,
      state: params.state,
      pincode: params.pincode,
      email: params.email ?? params.ownerEmail,
      clinic_type: params.clinicType,
      status: "trial",
      clinic_setup_completed: false,
      portal_enabled: false,
    })
    .select()
    .single();

  if (clinicError || !clinic) {
    return { error: clinicError?.message ?? "Failed to create clinic" };
  }

  await service.from("subscriptions").insert({
    clinic_id: clinic.id,
    plan_id: params.planId,
    status: "trialing",
  });

  await initializeClinicModules(clinic.id);

  const defaultDepartments = [
    "General Medicine",
    "Cardiology",
    "Orthopedics",
    "Pediatrics",
  ];
  await service.from("departments").insert(
    defaultDepartments.map((name) => ({ clinic_id: clinic.id, name }))
  );

  const ownerStaffCode = await generateStaffCode(clinic.id, "clinic_owner");
  const tempPassword = randomPassword();

  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email: params.ownerEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: params.ownerName, role: "clinic_owner" },
  });

  if (authError || !authUser.user) {
    await service.from("clinics").delete().eq("id", clinic.id);
    return { error: authError?.message ?? "Failed to create owner account" };
  }

  await service.from("profiles").upsert({
    id: authUser.user.id,
    email: params.ownerEmail,
    full_name: params.ownerName,
    role: "clinic_owner",
    clinic_id: clinic.id,
    staff_code: ownerStaffCode,
    is_active: true,
    first_login: true,
  });

  await service.from("clinic_billing_settings").upsert({
    clinic_id: clinic.id,
    tax_rate: 0,
    invoice_prefix: "INV",
    payment_methods: { cash: true, upi: true, card: true, insurance: true },
  });

  await savePlatformClinicCredentials(service, {
    clinicId: clinic.id,
    profileId: authUser.user.id,
    clinicCode,
    staffCode: ownerStaffCode,
    email: params.ownerEmail,
    initialPassword: tempPassword,
    role: "clinic_owner",
  });

  return {
    clinic,
    clinicCode,
    ownerEmail: params.ownerEmail,
    ownerName: params.ownerName,
    ownerStaffCode,
    ownerId: authUser.user.id,
    tempPassword,
  };
}

export async function createStaffAccount(params: {
  clinicId: string;
  clinicCode: string;
  clinicName: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  departmentId?: string;
  password?: string;
  moduleKeys?: string[];
  grantedBy?: string;
}) {
  if (!ASSIGNABLE_STAFF_ROLES.includes(params.role)) {
    return { error: "Invalid staff role" };
  }

  const service = await createServiceClient();
  const staffCode = await generateStaffCode(params.clinicId, params.role);
  const tempPassword = params.password ?? randomPassword();

  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email: params.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: params.fullName, role: params.role },
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("already")) {
      return { error: "A user with this email already exists" };
    }
    return { error: authError.message };
  }

  if (!authUser.user) return { error: "Failed to create account" };

  await service.from("profiles").upsert({
    id: authUser.user.id,
    email: params.email,
    full_name: params.fullName,
    phone: params.phone,
    role: params.role,
    clinic_id: params.clinicId,
    staff_code: staffCode,
    department_id: params.departmentId ?? null,
    is_active: true,
    first_login: true,
  });

  if (params.role === "doctor") {
    const { data: doctorRow } = await service
      .from("doctors")
      .upsert({ profile_id: authUser.user.id, clinic_id: params.clinicId }, { onConflict: "profile_id" })
      .select("id")
      .single();

    if (doctorRow?.id) {
      await enrichDoctorFromOnboarding(service, params.clinicId, doctorRow.id, authUser.user.id);
    }
  }

  const moduleKeys = params.moduleKeys ?? [];
  if (moduleKeys.length > 0 && params.grantedBy) {
    const rows = moduleKeys.map((key) => ({
      profile_id: authUser.user!.id,
      clinic_id: params.clinicId,
      module_key: key,
      permission_level: "write" as const,
      granted_by: params.grantedBy,
    }));
    await service.from("staff_module_permissions").upsert(rows, {
      onConflict: "profile_id,module_key",
    });
  }

  const activation = await createActivationToken(authUser.user.id, params.clinicId);
  if ("error" in activation) {
    return { error: activation.error };
  }

  return {
    userId: authUser.user.id,
    email: params.email,
    staffCode,
    activationToken: activation.token,
    clinicCode: params.clinicCode,
    clinicName: params.clinicName,
    fullName: params.fullName,
    role: params.role,
  };
}

export { randomPassword };
