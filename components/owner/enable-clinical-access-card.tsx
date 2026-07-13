"use client";

import { useState } from "react";
import { enableOwnerClinicalAccessAction } from "@/lib/actions/owner";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Stethoscope } from "lucide-react";

export function EnableClinicalAccessCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  async function handleEnable() {
    setLoading(true);
    setError(null);
    const result = await enableOwnerClinicalAccessAction();
    if (result?.error) setError(result.error);
    else setEnabled(true);
    setLoading(false);
  }

  if (enabled) {
    return (
      <Alert variant="success">
        Clinical access enabled. You can use My Queue and consultations from the owner portal.
      </Alert>
    );
  }

  return (
    <div className="clinic-card p-5 border-dashed border-[var(--secondary)]/40 bg-teal-50/30">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-[var(--secondary)]">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold">You also practice at this clinic?</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Enable clinical access on your owner account to see patients, run consultations, and manage your
              queue — without creating a separate doctor login. Doctor profiles from setup will be applied
              automatically.
            </p>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="button" onClick={handleEnable} loading={loading} size="sm">
            Enable clinical access for me
          </Button>
        </div>
      </div>
    </div>
  );
}
