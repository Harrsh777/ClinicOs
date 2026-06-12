import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth, requireModule } from "@/lib/auth/session";
import { getBill } from "@/lib/actions/billing";
import { getInsurancePolicies } from "@/lib/actions/insurance";
import { PageHeader, Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { PaymentPanel } from "@/components/billing/payment-panel";
import { Button } from "@/components/ui/button";

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireAuth();
  await requireModule(profile, "billing", "read");
  const { id } = await params;
  const bill = await getBill(id);
  if (!bill) notFound();

  const policies = await getInsurancePolicies(bill.patient_id);
  const amountDue = Number(bill.total_amount) - Number(bill.paid_amount);
  const lineItems = bill.bill_line_items as { description: string; item_type: string; amount: number }[];

  return (
    <div>
      <PageHeader
        title={`Invoice ${bill.invoice_number}`}
        subtitle={(bill.patients as { full_name: string })?.full_name}
        action={
          <Link href={`/print/invoice/${bill.id}`} target="_blank">
            <Button variant="secondary">Print Invoice</Button>
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex justify-between mb-4">
            <StatusBadge status={bill.status} />
            <span className="text-2xl font-bold">₹{Number(bill.total_amount).toFixed(2)}</span>
          </div>
          <div className="space-y-2">
            {(lineItems ?? []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-2 border-b border-[var(--border)]">
                <span>{item.description} <span className="text-[var(--text-muted)]">({item.item_type})</span></span>
                <span>₹{Number(item.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{Number(bill.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>₹{Number(bill.tax_amount).toFixed(2)}</span></div>
            {Number(bill.insurance_amount) > 0 && (
              <div className="flex justify-between text-[var(--brand-600)]">
                <span>Insurance</span><span>₹{Number(bill.insurance_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold"><span>Paid</span><span>₹{Number(bill.paid_amount).toFixed(2)}</span></div>
          </div>
        </Card>
        {amountDue > 0 && bill.status !== "paid" && (
          <PaymentPanel billId={bill.id} amountDue={amountDue} policies={policies} />
        )}
      </div>
    </div>
  );
}
