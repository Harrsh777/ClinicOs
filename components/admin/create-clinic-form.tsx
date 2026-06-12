"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createClinicAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

interface Plan {
  id: string;
  name: string;
}

export function CreateClinicForm({ plans }: { plans: Plan[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createClinicAction(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
    } else if (result?.inviteToken) {
      setInviteUrl(`/invite/${result.inviteToken}`);
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New Clinic
      </Button>
    );
  }

  return (
    <div className="clinic-card p-6 mb-6">
      <h3 className="font-semibold mb-4">Create New Clinic</h3>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {inviteUrl && (
        <Alert variant="success" className="mb-4">
          Clinic created! Owner invite link: <code className="font-mono text-xs">{inviteUrl}</code>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Clinic Name" name="name" required placeholder="City Health Clinic" />
        <Input label="Owner Email" name="ownerEmail" type="email" required placeholder="owner@clinic.com" />
        <Input label="Phone" name="phone" placeholder="+91 98765 43210" />
        <Input label="Address" name="address" placeholder="123 Main Street" />
        <Select
          label="Plan"
          name="planId"
          required
          options={plans.map((p) => ({ value: p.id, label: p.name }))}
        />
        <div className="flex items-end gap-2 sm:col-span-2">
          <Button type="submit" loading={loading}>Create Clinic</Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
