"use client";

import { useState } from "react";
import { Activity, Lock } from "lucide-react";
import { changePasswordAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await changePasswordAction(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="mb-2 flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Lock className="h-4 w-4 shrink-0" />
        <p>For security, you must set a new password before continuing to the setup wizard.</p>
      </div>

      <Input label="New password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
      <Input label="Confirm password" name="confirmPassword" type="password" required minLength={8} placeholder="Re-enter password" />

      <Button type="submit" loading={loading} size="lg" className="w-full">
        Set password &amp; continue
      </Button>
    </form>
  );
}
