"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { PatientVitals } from "@/lib/types/database";

export function VitalsChart({ vitals }: { vitals: PatientVitals[] }) {
  const data = vitals.map((v) => ({
    date: new Date(v.recorded_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    weight: v.weight_kg,
    systolic: v.bp_systolic,
    diastolic: v.bp_diastolic,
  }));

  return (
    <Card>
      <h4 className="font-medium mb-4">Vitals Trends</h4>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
          <YAxis tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="weight" stroke="var(--brand-500)" strokeWidth={2} dot={{ r: 3 }} name="Weight (kg)" />
          <Line type="monotone" dataKey="systolic" stroke="var(--danger-500)" strokeWidth={2} dot={{ r: 3 }} name="BP Systolic" />
          <Line type="monotone" dataKey="diastolic" stroke="var(--accent-500)" strokeWidth={2} dot={{ r: 3 }} name="BP Diastolic" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
