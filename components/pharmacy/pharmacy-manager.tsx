"use client";

import { useState, useTransition } from "react";
import { createMedicineAction, addStockAction } from "@/lib/actions/pharmacy";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  unit: string;
  reorder_level: number;
  pharmacy_stock?: { id: string; batch_number: string; quantity: number; expiry_date: string; selling_price: number | null }[];
}

export function PharmacyManager({ medicines }: { medicines: Medicine[] }) {
  const [tab, setTab] = useState<"catalog" | "stock">("catalog");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <div className="clinic-tabs mb-6">
        {(["catalog", "stock"] as const).map((t) => (
          <button key={t} type="button" className={`clinic-tab capitalize ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {message && <Alert variant={message.ok ? "success" : "error"} className="mb-4">{message.text}</Alert>}

      {tab === "catalog" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="font-semibold mb-4">Add Medicine</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const result = await createMedicineAction(new FormData(e.currentTarget));
                  setMessage({ text: result?.error ?? "Medicine added", ok: !result?.error });
                });
              }}
              className="space-y-3"
            >
              <Input label="Name" name="name" required placeholder="Paracetamol 500mg" />
              <Input label="Generic Name" name="genericName" placeholder="Acetaminophen" />
              <Input label="Unit" name="unit" defaultValue="tablet" />
              <Input label="Reorder Level" name="reorderLevel" type="number" defaultValue="50" />
              <Button type="submit" loading={pending}>Add Medicine</Button>
            </form>
          </Card>
          <Card>
            <h3 className="font-semibold mb-4">Catalog ({medicines.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {medicines.length === 0 ? (
                <EmptyState title="No medicines in catalog" description="Add your first medicine using the form" />
              ) : medicines.map((m) => {
                const totalStock = (m.pharmacy_stock ?? []).reduce((s, st) => s + st.quantity, 0);
                return (
                  <div key={m.id} className="flex justify-between text-sm py-2 border-b border-[var(--border)]">
                    <span>{m.name}</span>
                    <StatusBadge status={totalStock <= m.reorder_level ? "pending" : "active"} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === "stock" && (
        <Card className="max-w-lg">
          <h3 className="font-semibold mb-4">Add Stock Batch</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await addStockAction(new FormData(e.currentTarget));
                setMessage({ text: result?.error ?? "Stock added", ok: !result?.error });
              });
            }}
            className="space-y-3"
          >
            <Select
              label="Medicine"
              name="medicineId"
              required
              options={[
                { value: "", label: "Select..." },
                ...medicines.map((m) => ({ value: m.id, label: m.name })),
              ]}
            />
            <Input label="Batch Number" name="batchNumber" required />
            <Input label="Quantity" name="quantity" type="number" required />
            <Input label="Expiry Date" name="expiryDate" type="date" required />
            <Input label="Selling Price (₹)" name="sellingPrice" type="number" step="0.01" />
            <Button type="submit" loading={pending}>Add Stock</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
