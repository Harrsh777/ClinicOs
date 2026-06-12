import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getCommissionRules, getCommissionPayouts } from "@/lib/actions/commissions";
import { PageHeader } from "@/components/ui/card";
import { CommissionManager } from "@/components/commissions/commission-manager";
import { CalculateCommissionsButton } from "@/components/commissions/calculate-button";

export default async function OwnerCommissionsPage() {
  const profile = await requireRole(["clinic_owner"]);
  const supabase = await createClient();
  const month = new Date().toISOString().slice(0, 7);

  const [{ data: doctors }, rules, payouts] = await Promise.all([
    supabase.from("doctors").select("id, profiles(full_name)").eq("clinic_id", profile.clinic_id!),
    getCommissionRules(profile.clinic_id!),
    getCommissionPayouts(profile.clinic_id!),
  ]);

  return (
    <div>
      <PageHeader
        title="Doctor Commissions"
        subtitle="Configure rules and view monthly payout reports"
        action={<CalculateCommissionsButton clinicId={profile.clinic_id!} month={month} />}
      />
      <CommissionManager
        doctors={(doctors ?? []) as unknown as Parameters<typeof CommissionManager>[0]["doctors"]}
        payouts={payouts as unknown as Parameters<typeof CommissionManager>[0]["payouts"]}
        rules={rules.map((r) => ({ doctor_id: r.doctor_id, doctor_percentage: Number(r.doctor_percentage) }))}
      />
    </div>
  );
}
