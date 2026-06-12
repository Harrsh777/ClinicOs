"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { getRevenueStats } from "@/lib/actions/billing";
import { z } from "zod";

export async function getOwnerClinicIds(primaryClinicId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data: clinic, error } = await supabase
    .from("clinics")
    .select("franchise_group_id")
    .eq("id", primaryClinicId)
    .single();

  if (error || !clinic?.franchise_group_id) return [primaryClinicId];

  const { data: branches } = await supabase
    .from("clinics")
    .select("id")
    .eq("franchise_group_id", clinic.franchise_group_id)
    .eq("status", "active");

  return (branches ?? []).map((b) => b.id);
}

export async function getFranchiseOverview(ownerClinicId: string) {
  await requireRole(["clinic_owner"]);
  const supabase = await createClient();

  const { data: primary } = await supabase
    .from("clinics")
    .select("franchise_group_id")
    .eq("id", ownerClinicId)
    .single();

  if (!primary?.franchise_group_id) {
    return { group: null, branches: [], consolidated: null };
  }

  const { data: group } = await supabase
    .from("franchise_groups")
    .select("*")
    .eq("id", primary.franchise_group_id)
    .single();

  const { data: branches } = await supabase
    .from("clinics")
    .select("id, name, branch_label, city, status, slug")
    .eq("franchise_group_id", primary.franchise_group_id)
    .order("name");

  const branchStats = await Promise.all(
    (branches ?? []).map(async (b) => {
      const [revenue, { count: patients }] = await Promise.all([
        getRevenueStats(b.id),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", b.id),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const { count: waiting } = await supabase
        .from("queue_tokens")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", b.id)
        .eq("status", "waiting");

      return {
        ...b,
        displayName: b.branch_label ?? b.name,
        monthRevenue: revenue.monthRevenue,
        todayRevenue: revenue.todayRevenue,
        patientCount: patients ?? 0,
        patientsWaiting: waiting ?? 0,
      };
    })
  );

  const consolidated = {
    totalRevenue: branchStats.reduce((s, b) => s + b.monthRevenue, 0),
    todayRevenue: branchStats.reduce((s, b) => s + b.todayRevenue, 0),
    totalPatients: branchStats.reduce((s, b) => s + b.patientCount, 0),
    totalWaiting: branchStats.reduce((s, b) => s + b.patientsWaiting, 0),
  };

  return { group, branches: branchStats, consolidated };
}

const createGroupSchema = z.object({
  name: z.string().min(2),
});

export async function createFranchiseGroupAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  const parsed = createGroupSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: "Invalid group name" };

  const service = await createServiceClient();

  const { data: group, error } = await service
    .from("franchise_groups")
    .insert({ name: parsed.data.name, owner_profile_id: profile.id })
    .select()
    .single();

  if (error) return { error: error.message };

  await service
    .from("clinics")
    .update({ franchise_group_id: group.id, branch_label: "Main Branch" })
    .eq("id", profile.clinic_id!);

  revalidatePath("/owner/franchise");
  return { success: true, groupId: group.id };
}

const linkBranchSchema = z.object({
  clinicSlug: z.string().min(2),
  branchLabel: z.string().min(2),
});

export async function linkBranchToFranchiseAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  const parsed = linkBranchSchema.safeParse({
    clinicSlug: formData.get("clinicSlug"),
    branchLabel: formData.get("branchLabel"),
  });
  if (!parsed.success) return { error: "Invalid branch data" };

  const service = await createServiceClient();
  const { data: ownerClinic } = await service
    .from("clinics")
    .select("franchise_group_id")
    .eq("id", profile.clinic_id!)
    .single();

  if (!ownerClinic?.franchise_group_id) {
    return { error: "Create a franchise group first" };
  }

  const { data: branch, error } = await service
    .from("clinics")
    .update({
      franchise_group_id: ownerClinic.franchise_group_id,
      branch_label: parsed.data.branchLabel,
    })
    .eq("slug", parsed.data.clinicSlug)
    .select()
    .single();

  if (error || !branch) return { error: "Clinic not found with that slug" };

  revalidatePath("/owner/franchise");
  return { success: true };
}
