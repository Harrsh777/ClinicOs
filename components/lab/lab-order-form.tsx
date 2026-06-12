"use client";

import { useState } from "react";
import { createLabOrderAction } from "@/lib/actions/lab";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export function LabOrderForm({
  patientId,
  consultationId,
  doctorId,
  tests,
}: {
  patientId: string;
  consultationId?: string;
  doctorId?: string;
  tests: { id: string; name: string; code: string; price: number }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleOrder() {
    if (!selected.length) return;
    setLoading(true);
    const result = await createLabOrderAction({
      patientId,
      consultationId,
      doctorId,
      testIds: selected,
    });
    setMessage(result?.error ?? `Lab order created. ₹${result.totalLabFee} added to bill.`);
    setLoading(false);
    if (result?.success) setSelected([]);
  }

  if (!tests.length) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-muted)]">No lab tests configured. Owner can add tests in Lab catalog.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="font-semibold mb-4">Order Lab Tests</h3>
      {message && <Alert variant={message.includes("created") ? "success" : "error"} className="mb-4">{message}</Alert>}
      <div className="grid gap-2 sm:grid-cols-2 mb-4">
        {tests.map((t) => (
          <label key={t.id} className="flex items-center gap-2 p-2 rounded-[var(--radius-md)] border border-[var(--border)] cursor-pointer hover:bg-[var(--surface-1)]">
            <input
              type="checkbox"
              checked={selected.includes(t.id)}
              onChange={(e) =>
                setSelected((prev) => (e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)))
              }
            />
            <span className="text-sm flex-1">{t.name}</span>
            <span className="text-xs text-[var(--text-muted)]">₹{t.price}</span>
          </label>
        ))}
      </div>
      <Button onClick={() => void handleOrder()} loading={loading} disabled={!selected.length}>
        Order Selected Tests
      </Button>
    </Card>
  );
}
