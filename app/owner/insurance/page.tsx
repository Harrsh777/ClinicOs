import { requireRole } from "@/lib/auth/session";
import { getInsuranceClaims } from "@/lib/actions/insurance";
import { PageHeader } from "@/components/ui/card";
import { InsuranceClaimsTable } from "@/components/insurance/claims-table";

export default async function OwnerInsurancePage() {
  const profile = await requireRole(["clinic_owner"]);
  const claims = await getInsuranceClaims(profile.clinic_id!);

  return (
    <div>
      <PageHeader title="Insurance Claims" subtitle="Track claim lifecycle" />
      <InsuranceClaimsTable claims={claims} />
    </div>
  );
}
