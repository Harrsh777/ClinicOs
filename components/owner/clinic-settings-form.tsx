"use client";

import { useState } from "react";
import { updateClinicSettingsAction } from "@/lib/actions/owner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { Clinic } from "@/lib/types/database";

export function ClinicSettingsForm({ clinic }: { clinic: Clinic }) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await updateClinicSettingsAction(new FormData(e.currentTarget));
    setMessage(
      result?.error
        ? { type: "error", text: result.error }
        : { type: "success", text: "Settings saved" }
    );
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && <Alert variant={message.type === "success" ? "success" : "error"}>{message.text}</Alert>}
      <Input label="Clinic Name" name="name" defaultValue={clinic.name} required />
      <Input label="Phone" name="phone" defaultValue={clinic.phone ?? ""} />
      <Input label="Address" name="address" defaultValue={clinic.address ?? ""} />
      <Input
        label="Default Consultation Fee (₹)"
        name="consultationFee"
        type="number"
        defaultValue={clinic.consultation_fee_default}
      />
      <Button type="submit" loading={loading}>Save Settings</Button>
    </form>
  );
}
