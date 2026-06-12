"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { z } from "zod";

const expenseSchema = z.object({
  category: z.enum(["salary", "rent", "utilities", "supplies", "equipment", "marketing", "other"]),
  amount: z.coerce.number().positive(),
  expenseDate: z.string(),
  description: z.string().min(2),
});

export async function getExpenses(clinicId: string, from?: string, to?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("expense_date", { ascending: false });

  if (from) query = query.gte("expense_date", from);
  if (to) query = query.lte("expense_date", to);

  const { data } = await query;
  return data ?? [];
}

export async function addExpenseAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner", "finance_manager"]);
  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    expenseDate: formData.get("expenseDate"),
    description: formData.get("description"),
  });

  if (!parsed.success) return { error: "Invalid expense data" };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    clinic_id: profile.clinic_id!,
    category: parsed.data.category,
    amount: parsed.data.amount,
    expense_date: parsed.data.expenseDate,
    description: parsed.data.description,
    created_by: profile.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/owner/accounting");
  return { success: true };
}

export async function deleteExpenseAction(expenseId: string) {
  await requireRole(["clinic_owner"]);
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) return { error: error.message };
  revalidatePath("/owner/accounting");
  return { success: true };
}

export interface PLReport {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  expensesByCategory: Record<string, number>;
  monthlyCashFlow: { month: string; income: number; expenses: number }[];
}

export async function getPLReport(clinicId: string, from: string, to: string): Promise<PLReport> {
  const supabase = await createClient();

  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, created_at, bills!inner(clinic_id)")
      .eq("bills.clinic_id", clinicId)
      .eq("status", "completed")
      .gte("created_at", from)
      .lte("created_at", to + "T23:59:59"),
    supabase
      .from("expenses")
      .select("*")
      .eq("clinic_id", clinicId)
      .gte("expense_date", from)
      .lte("expense_date", to),
  ]);

  const totalIncome = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);

  const expensesByCategory: Record<string, number> = {};
  for (const e of expenses ?? []) {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + Number(e.amount);
  }

  const monthlyMap = new Map<string, { income: number; expenses: number }>();
  for (const p of payments ?? []) {
    const month = p.created_at.slice(0, 7);
    const cur = monthlyMap.get(month) ?? { income: 0, expenses: 0 };
    cur.income += Number(p.amount);
    monthlyMap.set(month, cur);
  }
  for (const e of expenses ?? []) {
    const month = e.expense_date.slice(0, 7);
    const cur = monthlyMap.get(month) ?? { income: 0, expenses: 0 };
    cur.expenses += Number(e.amount);
    monthlyMap.set(month, cur);
  }

  const monthlyCashFlow = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    expensesByCategory,
    monthlyCashFlow,
  };
}

export async function exportPLCsv(clinicId: string, from: string, to: string): Promise<string> {
  const report = await getPLReport(clinicId, from, to);
  const lines = [
    "ClinicOS P&L Report",
    `Period,${from} to ${to}`,
    "",
    "Summary",
    `Total Income,${report.totalIncome}`,
    `Total Expenses,${report.totalExpenses}`,
    `Net Profit,${report.netProfit}`,
    "",
    "Expenses by Category",
    ...Object.entries(report.expensesByCategory).map(([cat, amt]) => `${cat},${amt}`),
  ];
  return lines.join("\n");
}
