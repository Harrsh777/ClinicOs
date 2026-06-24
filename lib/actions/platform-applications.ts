"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createClinicWithOwner } from "@/lib/clinic/provision";
import { activationUrl } from "@/lib/auth/activation";
import { sendEmail } from "@/lib/email/send";
import { clinicApprovedEmail, clinicRejectedEmail } from "@/lib/email/templates";
import { logPlatformAuditEvent } from "@/lib/auth/audit";
import { z } from "zod";

export async function getClinicApplications(status?: "pending" | "approved" | "rejected") {
  await requireRole(["super_admin"]);
  const service = await createServiceClient();
  let query = service
    .from("clinic_applications")
    .select("*, clinics(name, clinic_code)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data } = await query;
  return data ?? [];
}

export async function getPendingApplicationCount() {
  const service = await createServiceClient();
  const { count } = await service
    .from("clinic_applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

const approveSchema = z.object({
  applicationId: z.string().uuid(),
  planId: z.string().uuid().optional(),
});

export async function approveClinicApplicationAction(formData: FormData) {
  const admin = await requireRole(["super_admin"]);
  const parsed = approveSchema.safeParse({
    applicationId: formData.get("applicationId"),
    planId: formData.get("planId") || undefined,
  });

  if (!parsed.success) return { error: "Invalid request" };

  const service = await createServiceClient();
  const { data: app } = await service
    .from("clinic_applications")
    .select("*")
    .eq("id", parsed.data.applicationId)
    .eq("status", "pending")
    .single();

  if (!app) return { error: "Application not found or already processed" };

  let planId = parsed.data.planId;
  if (!planId) {
    const { data: plan } = await service
      .from("plans")
      .select("id")
      .eq("slug", app.plan_slug)
      .maybeSingle();
    planId = plan?.id;
  }
  if (!planId) {
    const { data: proPlan } = await service.from("plans").select("id").eq("slug", "pro").single();
    planId = proPlan?.id;
  }
  if (!planId) return { error: "No subscription plan configured" };

  const result = await createClinicWithOwner({
    name: app.clinic_name,
    ownerEmail: app.owner_email,
    ownerName: app.owner_name,
    planId,
    phone: app.phone ?? app.owner_mobile ?? undefined,
    address: app.address ?? undefined,
    city: app.city ?? undefined,
    state: app.state ?? undefined,
    pincode: app.pincode ?? undefined,
    email: app.official_email ?? undefined,
    clinicType: app.clinic_type ?? undefined,
  });

  if ("error" in result && result.error) return { error: result.error };

  await service
    .from("clinic_applications")
    .update({
      status: "approved",
      clinic_id: result.clinic!.id,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", app.id);

  const activateLink = activationUrl(result.activationToken!);

  const emailResult = await sendEmail({
    to: result.ownerEmail!,
    subject: `MedERP — ${app.clinic_name} approved! Activate your account`,
    html: clinicApprovedEmail({
      ownerName: result.ownerName!,
      clinicName: app.clinic_name,
      clinicCode: result.clinicCode!,
      staffCode: result.ownerStaffCode!,
      activationUrl: activateLink,
    }),
  });

  await logPlatformAuditEvent({
    adminId: admin.id,
    action: "clinic.approved",
    targetClinicId: result.clinic!.id,
    details: { application_id: app.id, clinic_code: result.clinicCode },
  });

  revalidatePath("/admin/applications");
  revalidatePath("/admin/clinic-requests");
  revalidatePath("/admin/clinics");
  revalidatePath("/admin");

  return {
    success: true,
    clinicCode: result.clinicCode,
    staffCode: result.ownerStaffCode,
    emailSent: emailResult.ok,
    activationUrl: emailResult.ok ? undefined : activateLink,
  };
}

export async function rejectClinicApplicationAction(formData: FormData) {
  const admin = await requireRole(["super_admin"]);
  const applicationId = formData.get("applicationId") as string;
  const reason = (formData.get("reason") as string) || undefined;

  if (!applicationId) return { error: "Missing application ID" };

  const service = await createServiceClient();
  const { data: app } = await service
    .from("clinic_applications")
    .select("*")
    .eq("id", applicationId)
    .eq("status", "pending")
    .single();

  if (!app) return { error: "Application not found" };

  await service
    .from("clinic_applications")
    .update({
      status: "rejected",
      admin_notes: reason,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  await sendEmail({
    to: app.owner_email,
    subject: "MedERP — Clinic registration not approved",
    html: clinicRejectedEmail(app.clinic_name, reason),
  });

  await logPlatformAuditEvent({
    adminId: admin.id,
    action: "clinic.rejected",
    details: { application_id: applicationId, reason },
  });

  revalidatePath("/admin/applications");
  revalidatePath("/admin/clinic-requests");
  return { success: true };
}

export async function resendApprovalEmailAction(formData: FormData) {
  const admin = await requireRole(["super_admin"]);
  const applicationId = formData.get("applicationId") as string;
  if (!applicationId) return { error: "Missing application ID" };

  const service = await createServiceClient();
  const { data: app } = await service
    .from("clinic_applications")
    .select("*, clinics(clinic_code, name)")
    .eq("id", applicationId)
    .eq("status", "approved")
    .single();

  if (!app?.clinic_id) return { error: "Application not found or not approved" };

  const clinic = app.clinics as { clinic_code: string; name: string } | null;
  const { data: owner } = await service
    .from("profiles")
    .select("id, staff_code, full_name")
    .eq("clinic_id", app.clinic_id)
    .eq("role", "clinic_owner")
    .single();

  if (!owner) return { error: "Owner account not found" };

  const { createActivationToken } = await import("@/lib/auth/activation");
  const activation = await createActivationToken(owner.id, app.clinic_id);
  if ("error" in activation) return { error: activation.error };

  const activateLink = activationUrl(activation.token);
  const emailResult = await sendEmail({
    to: app.owner_email,
    subject: `MedERP — Activate your ${app.clinic_name} account`,
    html: clinicApprovedEmail({
      ownerName: owner.full_name,
      clinicName: app.clinic_name,
      clinicCode: clinic?.clinic_code ?? "",
      staffCode: owner.staff_code ?? "",
      activationUrl: activateLink,
    }),
  });

  await logPlatformAuditEvent({
    adminId: admin.id,
    action: "clinic.activation_resent",
    targetClinicId: app.clinic_id,
    details: { application_id: applicationId },
  });

  return { success: true, emailSent: emailResult.ok, activationUrl: emailResult.ok ? undefined : activateLink };
}
