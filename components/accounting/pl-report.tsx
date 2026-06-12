"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, StatCard } from "@/components/ui/card";
import type { PLReport } from "@/lib/actions/accounting";
import { IndianRupee, TrendingUp, TrendingDown } from "lucide-react";

interface PLReportViewProps {
  report: PLReport;
  from: string;
  to: string;
}

export function PLReportView({ report, from, to }: PLReportViewProps) {
  const chartData = report.monthlyCashFlow.map((m) => ({
    name: m.month,
    Income: m.income,
    Expenses: m.expenses,
  }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--text-muted)]">Period: {from} to {to}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Income"
          value={`₹${report.totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Total Expenses"
          value={`₹${report.totalExpenses.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <StatCard
          label="Net Profit"
          value={`₹${report.netProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          icon={<IndianRupee className="h-5 w-5" />}
          trend={report.netProfit >= 0 ? "Profitable" : "Loss"}
        />
      </div>

      {chartData.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">Cash Flow</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
              <Legend />
              <Bar dataKey="Income" fill="var(--brand-500)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="var(--danger-500)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold mb-4">Expenses by Category</h3>
        {Object.keys(report.expensesByCategory).length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No expenses recorded in this period.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(report.expensesByCategory).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between text-sm py-2 border-b border-[var(--border)] last:border-0">
                <span className="capitalize">{cat.replace(/_/g, " ")}</span>
                <span className="font-medium">₹{amt.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
