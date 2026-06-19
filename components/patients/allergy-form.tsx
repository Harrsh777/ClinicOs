"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addAllergyAction } from "@/lib/actions/patients";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export function AllergyForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    formData.set("patientId", patientId);
    const result = await addAllergyAction(formData);
    if (result?.error) {
      setMessage({ text: result.error, ok: false });
    } else {
      setMessage({ text: "Allergy added", ok: true });
      (e.target as HTMLFormElement).reset();
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
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <Input label="Allergen" name="allergen" required placeholder="Penicillin" className="min-w-[160px]" />
        <Select
          label="Severity"
          name="severity"
          options={[
            { value: "mild", label: "Mild" },
            { value: "moderate", label: "Moderate" },
            { value: "severe", label: "Severe" },
          ]}
        />
        <Input label="Reaction" name="reaction" placeholder="Rash, anaphylaxis..." className="min-w-[160px]" />
        <Button type="submit" loading={loading}>Add</Button>
      </form>
    </Card>
  );
}
