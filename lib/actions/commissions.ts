"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { z } from "zod";

const ruleSchema = z.object({
  doctorId: z.string().uuid(),
  doctorPercentage: z.coerce.number().min(0).max(100),
});

export async function getCommissionRules(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("doctor_commission_rules")
    .select("*, doctors(id, profiles(full_name))")
    .eq("clinic_id", clinicId)
    .eq("is_active", true);
  return data ?? [];
}

export async function setCommissionRuleAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  const parsed = ruleSchema.safeParse({
    doctorId: formData.get("doctorId"),
    doctorPercentage: formData.get("doctorPercentage"),
  });

  if (!parsed.success) return { error: "Invalid commission rule" };

  const clinicPct = 100 - parsed.data.doctorPercentage;
  const supabase = await createClient();

  const { error } = await supabase.from("doctor_commission_rules").upsert(
    {
      clinic_id: profile.clinic_id!,
      doctor_id: parsed.data.doctorId,
      doctor_percentage: parsed.data.doctorPercentage,
      clinic_percentage: clinicPct,
      is_active: true,
    },
    { onConflict: "clinic_id,doctor_id" }
  );

  if (error) return { error: error.message };
  revalidatePath("/owner/commissions");
  return { success: true };
}

export async function calculateMonthlyCommissions(clinicId: string, month: string) {
  const supabase = await createClient();
  const startDate = `${month}-01`;
  const endDate = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0)
    .toISOString()
    .split("T")[0];

  const [{ data: doctors }, { data: rules }] = await Promise.all([
    supabase.from("doctors").select("id, profiles(full_name)").eq("clinic_id", clinicId),
    supabase.from("doctor_commission_rules").select("*").eq("clinic_id", clinicId).eq("is_active", true),
  ]);

  const payouts = [];

  for (const doctor of doctors ?? []) {
    const rule = rules?.find((r) => r.doctor_id === doctor.id);
    const doctorPct = rule?.doctor_percentage ?? 60;
    const clinicPct = rule?.clinic_percentage ?? 40;

    const { data: consultations } = await supabase
      .from("consultations")
      .select("id")
      .eq("doctor_id", doctor.id)
      .eq("status", "completed")
      .gte("ended_at", startDate)
      .lte("ended_at", endDate + "T23:59:59");

    const consultIds = (consultations ?? []).map((c) => c.id);
    let totalRevenue = 0;

    if (consultIds.length > 0) {
      const { data: bills } = await supabase
        .from("bills")
        .select("total_amount")
        .eq("clinic_id", clinicId)
        .in("consultation_id", consultIds);

      totalRevenue = (bills ?? []).reduce((s, b) => s + Number(b.total_amount), 0);
    }

    const doctorShare = (totalRevenue * doctorPct) / 100;
    const clinicShare = (totalRevenue * clinicPct) / 100;

    const { data: payout } = await supabase
      .from("doctor_commission_payouts")
      .upsert(
        {
          clinic_id: clinicId,
          doctor_id: doctor.id,
          period_month: startDate,
          total_revenue: totalRevenue,
          doctor_share: doctorShare,
          clinic_share: clinicShare,
        },
        { onConflict: "clinic_id,doctor_id,period_month" }
      )
      .select("*, doctors(id, profiles(full_name))")
      .single();

    if (payout) payouts.push(payout);
  }

  return payouts;
}

export async function getCommissionPayouts(clinicId: string, month?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("doctor_commission_payouts")
    .select("*, doctors(id, profiles(full_name))")
    .eq("clinic_id", clinicId)
    .order("period_month", { ascending: false });

  if (month) query = query.eq("period_month", `${month}-01`);

  const { data } = await query;
  return data ?? [];
}

export async function addCommissionAdjustmentAction(
  payoutId: string,
  adjustment: number,
  notes: string
) {
  await requireRole(["clinic_owner"]);
  const supabase = await createClient();

  const { data: payout } = await supabase
    .from("doctor_commission_payouts")
    .select("doctor_share, adjustments")
    .eq("id", payoutId)
    .single();

  if (!payout) return { error: "Payout not found" };

  const { error } = await supabase
    .from("doctor_commission_payouts")
    .update({
      adjustments: Number(payout.adjustments) + adjustment,
      doctor_share: Number(payout.doctor_share) + adjustment,
      notes,
    })
    .eq("id", payoutId);

  if (error) return { error: error.message };
  revalidatePath("/owner/commissions");
  return { success: true };
}
