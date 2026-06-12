import { requireRole } from "@/lib/auth/session";
import { getBills } from "@/lib/actions/billing";
import { PageHeader } from "@/components/ui/card";
import { BillsTable } from "@/components/billing/bills-table";

export default async function FinanceBillingPage() {
  const profile = await requireRole(["finance_manager"]);
  const bills = await getBills(profile.clinic_id!);

  return (
    <div>
      <PageHeader title="Billing & Finance" subtitle="All clinic invoices and payments" />
      <BillsTable bills={bills} basePath="/finance" />
    </div>
  );
}
