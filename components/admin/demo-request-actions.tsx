"use client";

import { useState, useTransition } from "react";
import { updateDemoRequestAction } from "@/lib/actions/demo-requests";
import type { DemoRequest, DemoRequestStatus } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";

const STATUS_OPTIONS: { value: DemoRequestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export function DemoRequestActions({ request }: { request: DemoRequest }) {
  const [status, setStatus] = useState<DemoRequestStatus>(request.status);
  const [notes, setNotes] = useState(request.admin_notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    const formData = new FormData();
    formData.set("id", request.id);
    formData.set("status", status);
    formData.set("adminNotes", notes);

    startTransition(async () => {
      const result = await updateDemoRequestAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-2 min-w-[220px]">
      <Select
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value as DemoRequestStatus)}
        options={STATUS_OPTIONS}
      />
      <Textarea
        label="Admin notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Internal notes..."
      />
      {error && <p className="text-xs text-[var(--danger-500)]">{error}</p>}
      <Button type="button" size="sm" loading={pending} onClick={save}>
        Save
      </Button>
    </div>
  );
}
