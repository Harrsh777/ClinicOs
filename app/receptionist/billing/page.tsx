import { requireRole } from "@/lib/auth/session";
import { getBills } from "@/lib/actions/billing";
import { PageHeader } from "@/components/ui/card";
import { BillsTable } from "@/components/billing/bills-table";

export default async function ReceptionistBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await requireRole(["receptionist"]);
  const { status } = await searchParams;
  const bills = await getBills(profile.clinic_id!, status);

  return (
    <div>
      <PageHeader title="Billing" subtitle="Invoices and payment collection" />
      <div className="flex gap-2 mb-4">
        {["", "unpaid", "partial", "paid"].map((s) => (
          <a
            key={s || "all"}
            href={`/receptionist/billing${s ? `?status=${s}` : ""}`}
            className="clinic-btn clinic-btn-sm clinic-btn-secondary"
          >
            {s || "All"}
          </a>
        ))}
      </div>
      <BillsTable bills={bills} basePath="/receptionist" />
    </div>
  );
}
