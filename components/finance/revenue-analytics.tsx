"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";

type RevenueAnalytics = {
  dailyRevenue: { date: string; revenue: number; invoices: number }[];
  paymentMix: { method: string; amount: number }[];
  collectionHealth: { name: string; value: number }[];
};

const COLORS = ["#14B8A6", "#3B82F6", "#06B6D4", "#F59E0B", "#8B5CF6"];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function RevenueAnalytics({ data }: { data: RevenueAnalytics }) {
  const hasPaymentMix = data.paymentMix.some((item) => item.amount > 0);
  const hasCollectionHealth = data.collectionHealth.some((item) => item.value > 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Revenue momentum</h2>
            <p className="text-sm text-[var(--text-secondary)]">Collections and invoice volume over the last 14 days</p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            Live finance
          </span>
        </div>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailyRevenue} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 12 }}
                tickFormatter={(value) => `₹${Number(value) / 1000}k`}
              />
              <Tooltip
                formatter={(value, name) =>
                  name === "revenue" ? [currency.format(Number(value)), "Revenue"] : [value, "Invoices"]
                }
                contentStyle={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 16,
                  boxShadow: "0 12px 40px rgba(15,23,42,.08)",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#14B8A6"
                strokeWidth={3}
                fill="url(#revenueGradient)"
                activeDot={{ r: 5, fill: "#14B8A6", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6">
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Payment mix</h3>
            <p className="text-sm text-[var(--text-secondary)]">Collected amount by channel</p>
          </div>
          <div className="h-[180px]">
            {hasPaymentMix ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.paymentMix}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="method" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => currency.format(Number(value))} cursor={{ fill: "rgba(20,184,166,.08)" }} />
                  <Bar dataKey="amount" radius={[10, 10, 0, 0]}>
                    {data.paymentMix.map((entry, index) => (
                      <Cell key={entry.method} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState label="No completed payments yet" />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Collection health</h3>
            <p className="text-sm text-[var(--text-secondary)]">Collected versus outstanding</p>
          </div>
          <div className="h-[180px]">
            {hasCollectionHealth ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.collectionHealth}
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.collectionHealth.map((entry, index) => (
                      <Cell key={entry.name} fill={index === 0 ? "#14B8A6" : "#EF4444"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => currency.format(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState label="No bill activity yet" />
            )}
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#14B8A6]" />Collected</span>
            <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#EF4444]" />Outstanding</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyChartState({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] text-sm text-[var(--text-secondary)]">
      {label}
    </div>
  );
}
