import { createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { UserRole } from "@/lib/types/database";

function randomPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) out += chars[bytes[i]! % chars.length];
  return out;
}

export async function generateClinicCode(): Promise<string> {
  const service = await createServiceClient();
  const { data, error } = await service.rpc("generate_clinic_code");
  if (!error && data) return data as string;
  return `CLN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
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
      status: "trial",
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

  const password = randomPassword();
  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email: params.ownerEmail,
    password,
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
    is_active: true,
  });

  return {
    clinic,
    clinicCode,
    ownerEmail: params.ownerEmail,
    ownerName: params.ownerName,
    password,
    ownerId: authUser.user.id,
  };
}

export async function createStaffAccount(params: {
  clinicId: string;
  clinicCode: string;
  clinicName: string;
  email: string;
  fullName: string;
  role: UserRole;
  password?: string;
  moduleKeys?: string[];
  grantedBy?: string;
}) {
  if (!["doctor", "receptionist", "finance_manager"].includes(params.role)) {
    return { error: "Invalid staff role" };
  }

  const service = await createServiceClient();
  const password = params.password ?? randomPassword();

  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email: params.email,
    password,
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
    role: params.role,
    clinic_id: params.clinicId,
    is_active: true,
  });

  if (params.role === "doctor") {
    await service.from("doctors").upsert(
      { profile_id: authUser.user.id, clinic_id: params.clinicId },
      { onConflict: "profile_id" }
    );
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

  return {
    userId: authUser.user.id,
    email: params.email,
    password,
    clinicCode: params.clinicCode,
    clinicName: params.clinicName,
    fullName: params.fullName,
    role: params.role,
  };
}

export { randomPassword };
