"use client";

import { useState } from "react";
import { Activity, Lock } from "lucide-react";
import { platformAdminLoginAction } from "@/lib/actions/platform-admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function PlatformAdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await platformAdminLoginAction(formData);
    if (result?.error) setError(result.error);
    setLoading(false);
  }

  return (
    <div className="clinic-auth-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,.5)]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-slate-800 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">ClinicOS Admin</h1>
            <p className="text-sm text-[var(--text-secondary)]">Platform control panel</p>
          </div>
        </div>

        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Enter the platform admin password to manage clinics, demo requests, and credentials.
        </p>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Admin password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••"
          />
          <Button type="submit" loading={loading} className="w-full gap-2">
            <Lock className="h-4 w-4" />
            Sign in to admin
          </Button>
        </form>
      </div>
    </div>
  );
}
