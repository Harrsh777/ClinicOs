"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { logPlatformAuditEvent } from "@/lib/auth/audit";

export type ClinicManagementStatus = "pending" | "approved" | "rejected" | "suspended" | "active" | "trial";

export interface ClinicManagementRow {
  id: string;
  kind: "application" | "clinic";
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  clinicType: string | null;
  doctorCount: number | null;
  status: ClinicManagementStatus;
  clinicCode: string | null;
  clinicId: string | null;
  applicationId: string | null;
  createdAt: string;
  rejectionReason: string | null;
}

export async function getClinicManagementRows(
  statusFilter?: ClinicManagementStatus | "all"
): Promise<ClinicManagementRow[]> {
  await requirePlatformAdmin();
  const service = await createServiceClient();

  const [{ data: applications }, { data: clinics }] = await Promise.all([
    service
      .from("clinic_applications")
      .select("*, clinics(clinic_code, status)")
      .order("created_at", { ascending: false }),
    service
      .from("clinics")
      .select("id, name, clinic_code, city, state, phone, email, clinic_type, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const rows: ClinicManagementRow[] = [];

  for (const app of applications ?? []) {
    const linkedClinic = app.clinics as { clinic_code?: string; status?: string } | null;
    let status: ClinicManagementStatus = app.status as ClinicManagementStatus;
    if (app.status === "approved" && linkedClinic?.status === "suspended") {
      status = "suspended";
    } else if (app.status === "approved") {
      status = linkedClinic?.status === "trial" ? "trial" : "approved";
    }

    rows.push({
      id: app.id,
      kind: "application",
      name: app.clinic_name,
      ownerName: app.owner_name,
      ownerEmail: app.owner_email,
      phone: app.phone ?? app.owner_mobile,
      city: app.city,
      state: app.state,
      clinicType: app.clinic_type,
      doctorCount: app.doctor_count,
      status,
      clinicCode: linkedClinic?.clinic_code ?? null,
      clinicId: app.clinic_id,
      applicationId: app.id,
      createdAt: app.created_at,
      rejectionReason: app.rejection_reason ?? app.admin_notes,
    });
  }

  const appClinicIds = new Set((applications ?? []).map((a) => a.clinic_id).filter(Boolean));

  for (const clinic of clinics ?? []) {
    if (appClinicIds.has(clinic.id)) continue;
    rows.push({
      id: clinic.id,
      kind: "clinic",
      name: clinic.name,
      ownerName: null,
      ownerEmail: clinic.email,
      phone: clinic.phone,
      city: clinic.city,
      state: clinic.state,
      clinicType: clinic.clinic_type,
      doctorCount: null,
      status: clinic.status as ClinicManagementStatus,
      clinicCode: clinic.clinic_code,
      clinicId: clinic.id,
      applicationId: null,
      createdAt: clinic.created_at,
      rejectionReason: null,
    });
  }

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!statusFilter || statusFilter === "all") return rows;
  return rows.filter((r) => r.status === statusFilter);
}

export async function reactivateClinicAction(clinicId: string) {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("clinic_setup_completed")
    .eq("id", clinicId)
    .single();

  const { error } = await supabase
    .from("clinics")
    .update({
      status: "active",
      portal_enabled: clinic?.clinic_setup_completed ?? false,
    })
    .eq("id", clinicId);

  if (error) return { error: error.message };

  await logPlatformAuditEvent({
    adminId: null,
    action: "clinic.reactivated",
    targetClinicId: clinicId,
  });

  revalidatePath("/admin/clinics");
  return { success: true };
}
