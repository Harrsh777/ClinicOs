"use client";

import { useState } from "react";
import { recordVitalsAction } from "@/lib/actions/patients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function VitalsForm({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("patientId", patientId);
    await recordVitalsAction(formData);
    setLoading(false);
    e.currentTarget.reset();
    window.location.reload();
  }

  return (
    <Card>
      <h4 className="font-medium mb-4">Record Vitals</h4>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Input label="Height (cm)" name="heightCm" type="number" step="0.1" />
          <Input label="Weight (kg)" name="weightKg" type="number" step="0.1" />
          <Input label="Temp (°C)" name="temperatureC" type="number" step="0.1" />
          <Input label="BP Systolic" name="bpSystolic" type="number" />
          <Input label="BP Diastolic" name="bpDiastolic" type="number" />
          <Input label="Pulse" name="pulse" type="number" />
          <Input label="SpO2 (%)" name="spo2" type="number" />
          <Input label="Blood Sugar" name="bloodSugar" type="number" step="0.1" />
        </div>
        <Button type="submit" loading={loading} className="mt-4">Save Vitals</Button>
      </form>
    </Card>
  );
}
