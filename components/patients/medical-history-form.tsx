"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertMedicalHistoryAction } from "@/lib/actions/patients";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export function MedicalHistoryForm({
  patientId,
  history,
}: {
  patientId: string;
  history: Record<string, string | null> | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    formData.set("patientId", patientId);
    const result = await upsertMedicalHistoryAction(formData);
    if (result?.error) {
      setMessage({ text: result.error, ok: false });
    } else {
      setMessage({ text: "Medical history saved", ok: true });
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      {message && (
        <Alert variant={message.ok ? "success" : "error"} className="mb-4">
          {message.text}
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea label="Past Illnesses" name="illnesses" defaultValue={history?.illnesses ?? ""} rows={2} />
        <Textarea label="Surgeries" name="surgeries" defaultValue={history?.surgeries ?? ""} rows={2} />
        <Textarea label="Family History" name="familyHistory" defaultValue={history?.family_history ?? ""} rows={2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Smoking Status" name="smokingStatus" defaultValue={history?.smoking_status ?? ""} placeholder="Non-smoker, former, current..." />
          <Input label="Alcohol Status" name="alcoholStatus" defaultValue={history?.alcohol_status ?? ""} placeholder="None, occasional, regular..." />
        </div>
        <Textarea label="Chronic Conditions" name="chronicConditions" defaultValue={history?.chronic_conditions ?? ""} rows={2} />
        <Textarea label="Notes" name="notes" defaultValue={history?.notes ?? ""} rows={2} />
        <Button type="submit" loading={loading}>Save History</Button>
      </form>
    </Card>
  );
}
