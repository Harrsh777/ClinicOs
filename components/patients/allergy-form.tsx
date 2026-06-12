"use client";

import { useState } from "react";
import { addAllergyAction } from "@/lib/actions/patients";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AllergyForm({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("patientId", patientId);
    await addAllergyAction(formData);
    setLoading(false);
    e.currentTarget.reset();
    window.location.reload();
  }

  return (
    <Card>
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
