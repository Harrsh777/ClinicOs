"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaymentPanel } from "@/components/billing/payment-panel";
import { Receipt, Download } from "lucide-react";

interface Bill {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  patient_amount: number;
  created_at: string;
}

export function PatientBillsList({ bills }: { bills: Bill[] }) {
  const unpaid = bills.filter((b) => b.status !== "paid");

  if (!bills.length) return <EmptyState icon={<Receipt />} title="No bills yet" />;

  return (
    <div className="space-y-4">
      {unpaid.map((bill) => {
        const due = Number(bill.patient_amount || bill.total_amount) - Number(bill.paid_amount);
        return (
          <Card key={bill.id} padding className="!p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-mono font-medium">{bill.invoice_number}</p>
                <p className="text-sm text-[var(--text-muted)]">{new Date(bill.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">₹{Number(bill.total_amount).toFixed(2)}</p>
                <StatusBadge status={bill.status} />
                <div className="mt-2">
                  <Link href={`/print/invoice/${bill.id}`} target="_blank">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Download className="h-3.5 w-3.5" />
                      Invoice
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            {due > 0 && <PaymentPanel billId={bill.id} amountDue={due} />}
          </Card>
        );
      })}
      {bills.filter((b) => b.status === "paid").length > 0 && (
        <div>
          <h3 className="font-medium mb-3 text-[var(--text-muted)]">Paid</h3>
          {bills.filter((b) => b.status === "paid").map((bill) => (
            <div key={bill.id} className="flex justify-between py-2 text-sm border-b border-[var(--border)]">
              <span>{bill.invoice_number}</span>
              <span>₹{Number(bill.total_amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
