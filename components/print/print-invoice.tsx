"use client";

import { useEffect } from "react";

interface PrintInvoiceProps {
  bill: {
    invoice_number: string;
    created_at: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    insurance_amount: number;
    patient_amount: number;
    status: string;
    patients: { full_name: string; phone: string };
    bill_line_items: { description: string; item_type: string; quantity: number; unit_price: number; amount: number }[];
  };
}

export function PrintInvoice({ bill }: PrintInvoiceProps) {
  useEffect(() => {
    setTimeout(() => window.print(), 500);
  }, []);

  const items = bill.bill_line_items ?? [];

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white text-black">
      <style>{`@media print { body { background: white; } }`}</style>
      <div className="flex justify-between border-b-2 border-[var(--brand-600)] pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-700)]">TAX INVOICE</h1>
          <p className="font-mono mt-1">{bill.invoice_number}</p>
        </div>
        <div className="text-right text-sm">
          <p>{new Date(bill.created_at).toLocaleDateString()}</p>
          <p className="capitalize mt-1 font-medium">{bill.status}</p>
        </div>
      </div>

      <div className="mb-6 text-sm">
        <p><strong>Bill To:</strong> {bill.patients.full_name}</p>
        <p>{bill.patients.phone}</p>
      </div>

      <table className="w-full mb-6 text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-2">Description</th>
            <th className="text-right py-2">Qty</th>
            <th className="text-right py-2">Rate</th>
            <th className="text-right py-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-2">{item.description}</td>
              <td className="text-right py-2">{item.quantity}</td>
              <td className="text-right py-2">₹{Number(item.unit_price).toFixed(2)}</td>
              <td className="text-right py-2">₹{Number(item.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-sm space-y-1 ml-auto max-w-xs">
        <div className="flex justify-between"><span>Subtotal</span><span>₹{Number(bill.subtotal).toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>₹{Number(bill.tax_amount).toFixed(2)}</span></div>
        {Number(bill.insurance_amount) > 0 && (
          <div className="flex justify-between text-blue-700"><span>Insurance</span><span>₹{Number(bill.insurance_amount).toFixed(2)}</span></div>
        )}
        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>Total</span><span>₹{Number(bill.total_amount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-green-700"><span>Paid</span><span>₹{Number(bill.paid_amount).toFixed(2)}</span></div>
        <div className="flex justify-between font-bold">
          <span>Balance Due</span>
          <span>₹{(Number(bill.total_amount) - Number(bill.paid_amount)).toFixed(2)}</span>
        </div>
      </div>

      <button type="button" onClick={() => window.print()} className="clinic-btn clinic-btn-primary mt-8 print:hidden">
        Print / Save as PDF
      </button>
    </div>
  );
}
