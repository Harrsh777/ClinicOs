"use client";

import { useState, useTransition } from "react";
import { recordCashPaymentAction, createRazorpayOrderAction } from "@/lib/actions/billing";
import { applyInsuranceSplitAction } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface PaymentPanelProps {
  billId: string;
  amountDue: number;
  policies?: { id: string; company: string; policy_number: string; coverage_percent: number }[];
}

export function PaymentPanel({ billId, amountDue, policies = [] }: PaymentPanelProps) {
  const [cashAmount, setCashAmount] = useState(amountDue.toString());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleRazorpay() {
    const result = await createRazorpayOrderAction(billId);
    if (result?.error) { setMessage(result.error); return; }
    if (!result.orderId || !result.keyId) return;

    const loaded = await loadRazorpayScript();
    if (!loaded) { setMessage("Failed to load payment gateway"); return; }

    const rzp = new window.Razorpay({
      key: result.keyId,
      amount: result.amount,
      currency: "INR",
      name: "ClinicOS",
      description: "Medical Bill Payment",
      order_id: result.orderId,
      handler: () => {
        setMessage("Payment successful! Refreshing...");
        window.location.reload();
      },
    });
    rzp.open();
  }

  return (
    <Card>
      <h3 className="font-semibold mb-4">Collect Payment</h3>
      <p className="text-2xl font-bold text-[var(--brand-600)] mb-4">₹{amountDue.toFixed(2)} due</p>

      {message && <Alert variant={message.includes("success") ? "success" : "error"} className="mb-4">{message}</Alert>}

      <div className="space-y-4">
        <div className="flex gap-2 items-end">
          <Input label="Cash Amount (₹)" type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
          <Button
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await recordCashPaymentAction(billId, parseFloat(cashAmount));
                setMessage(result?.error ?? `Cash recorded. Receipt: ${result.receiptNumber}`);
              })
            }
          >
            Record Cash
          </Button>
        </div>

        <Button variant="secondary" className="w-full" onClick={() => void handleRazorpay()}>
          Pay via UPI / Card (Razorpay)
        </Button>

        {policies.length > 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const fd = new FormData(e.currentTarget);
                fd.set("billId", billId);
                const result = await applyInsuranceSplitAction(fd);
                setMessage(
                  result?.error ??
                    `Insurance split applied. Patient pays ₹${result.patientAmount}, insurance ₹${result.insuranceAmount}`
                );
              });
            }}
          >
            <Select
              label="Apply Insurance Policy"
              name="policyId"
              options={policies.map((p) => ({
                value: p.id,
                label: `${p.company} (${p.coverage_percent}% coverage)`,
              }))}
            />
            <Button type="submit" variant="ghost" className="mt-2" loading={pending}>
              Apply Insurance Split
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}
