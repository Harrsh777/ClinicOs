"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordVitalsAction } from "@/lib/actions/patients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export function VitalsForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    formData.set("patientId", patientId);
    const result = await recordVitalsAction(formData);
    if (result?.error) {
      setMessage({ text: result.error, ok: false });
    } else {
      setMessage({ text: "Vitals saved", ok: true });
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <h4 className="font-medium mb-4">Record Vitals</h4>
      {message && (
        <Alert variant={message.ok ? "success" : "error"} className="mb-4">
          {message.text}
        </Alert>
      )}
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
