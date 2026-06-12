"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Activity } from "lucide-react";
import { acceptInviteAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("token", token);
    const result = await acceptInviteAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="clinic-auth-bg flex min-h-screen items-center justify-center p-4">
      <div className="clinic-auth-card">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-500)]">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Accept Invitation</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Set up your ClinicOS account</p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name" name="fullName" required placeholder="Dr. Priya Sharma" />
          <Input label="Password" name="password" type="password" required minLength={8} placeholder="Min 8 characters" />
          <Input label="Confirm Password" name="confirm" type="password" required minLength={8} placeholder="Repeat password" />
          <Button type="submit" loading={loading} className="w-full">
            Create Account
          </Button>
        </form>
      </div>
    </div>
  );
}
