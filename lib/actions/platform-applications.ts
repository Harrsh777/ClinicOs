"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createClinicWithOwner } from "@/lib/clinic/provision";
import { sendEmail } from "@/lib/email/send";
import { clinicApprovedEmail, clinicRejectedEmail } from "@/lib/email/templates";
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
    phone: app.phone ?? undefined,
    address: app.address ?? undefined,
    city: app.city ?? undefined,
    state: app.state ?? undefined,
    pincode: app.pincode ?? undefined,
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

  const emailResult = await sendEmail({
    to: result.ownerEmail!,
    subject: `ClinicOS — ${app.clinic_name} approved! Your login credentials`,
    html: clinicApprovedEmail({
      ownerName: result.ownerName!,
      clinicName: app.clinic_name,
      clinicCode: result.clinicCode!,
      email: result.ownerEmail!,
      password: result.password!,
    }),
  });

  revalidatePath("/admin/applications");
  revalidatePath("/admin/clinics");
  revalidatePath("/admin");

  return {
    success: true,
    clinicCode: result.clinicCode,
    emailSent: emailResult.ok,
    emailError: emailResult.ok ? undefined : emailResult.error,
    credentials: emailResult.ok
      ? undefined
      : {
          clinicCode: result.clinicCode,
          email: result.ownerEmail,
          password: result.password,
        },
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
    subject: "ClinicOS — Application update",
    html: clinicRejectedEmail(app.clinic_name, reason),
  });

  revalidatePath("/admin/applications");
  return { success: true };
}
