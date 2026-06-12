"use client";

import { useState } from "react";
import { addExpenseAction } from "@/lib/actions/accounting";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

const CATEGORIES = [
  { value: "salary", label: "Salary" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "equipment", label: "Equipment" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

export function ExpenseForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const result = await addExpenseAction(fd);
    if (result?.error) setMessage(result.error);
    else {
      setMessage("Expense recorded successfully");
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select name="category" label="Category" required options={CATEGORIES} />
        <Input name="amount" label="Amount (₹)" type="number" step="0.01" min="0" required />
        <Input
          name="expenseDate"
          label="Date"
          type="date"
          defaultValue={new Date().toISOString().split("T")[0]}
          required
        />
        <Input name="description" label="Description" required placeholder="e.g. Monthly rent" />
      </div>
      {message && (
        <p className={`text-sm ${message.includes("success") ? "text-[var(--success-700)]" : "text-[var(--danger-500)]"}`}>
          {message}
        </p>
      )}
      <Button type="submit" loading={loading}>Add Expense</Button>
    </form>
  );
}
