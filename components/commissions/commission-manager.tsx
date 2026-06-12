"use client";

import { useState } from "react";
import { setCommissionRuleAction } from "@/lib/actions/commissions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Doctor {
  id: string;
  profiles: { full_name: string } | null;
}

interface Payout {
  id: string;
  period_month: string;
  total_revenue: number;
  doctor_share: number;
  clinic_share: number;
  adjustments: number;
  doctors: { profiles: { full_name: string } | null };
}

interface CommissionManagerProps {
  doctors: Doctor[];
  payouts: Payout[];
  rules: { doctor_id: string; doctor_percentage: number }[];
}

export function CommissionManager({ doctors, payouts, rules }: CommissionManagerProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRuleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await setCommissionRuleAction(fd);
    setMessage(result?.error ?? "Commission rule saved");
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <Card>
        <h3 className="font-semibold mb-4">Set Commission Rules</h3>
        <form onSubmit={(e) => void handleRuleSubmit(e)} className="grid gap-4 sm:grid-cols-3 items-end">
          <Select
            name="doctorId"
            label="Doctor"
            required
            options={[
              { value: "", label: "Select doctor" },
              ...doctors.map((d) => ({
                value: d.id,
                label: d.profiles?.full_name ?? "Doctor",
              })),
            ]}
          />
          <Input name="doctorPercentage" label="Doctor %" type="number" min="0" max="100" defaultValue="60" required />
          <Button type="submit" loading={loading}>Save Rule</Button>
        </form>
        {message && <p className="text-sm mt-2 text-[var(--text-secondary)]">{message}</p>}
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">Monthly Payouts</h3>
        {payouts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No payouts calculated yet. Run monthly calculation from the dashboard.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="clinic-table w-full">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Period</th>
                  <th>Revenue</th>
                  <th>Doctor Share</th>
                  <th>Clinic Share</th>
                  <th>Rule</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const rule = rules.find((r) => r.doctor_id === (p.doctors as { id?: string })?.id);
                  return (
                    <tr key={p.id}>
                      <td>{p.doctors?.profiles?.full_name ?? "—"}</td>
                      <td>{new Date(p.period_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                      <td>₹{Number(p.total_revenue).toLocaleString("en-IN")}</td>
                      <td className="font-medium text-[var(--success-700)]">₹{Number(p.doctor_share).toLocaleString("en-IN")}</td>
                      <td>₹{Number(p.clinic_share).toLocaleString("en-IN")}</td>
                      <td><Badge variant="neutral">{rule?.doctor_percentage ?? 60}%</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
