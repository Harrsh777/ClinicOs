import { requireRole } from "@/lib/auth/session";
import { getBills } from "@/lib/actions/billing";
import { PageHeader } from "@/components/ui/card";
import { BillsTable } from "@/components/billing/bills-table";

export default async function OwnerBillingPage() {
  const profile = await requireRole(["clinic_owner"]);
  const bills = await getBills(profile.clinic_id!);

  return (
    <div>
      <PageHeader title="Billing" subtitle="All clinic invoices" />
      <BillsTable bills={bills} basePath="/owner" />
    </div>
  );
}
