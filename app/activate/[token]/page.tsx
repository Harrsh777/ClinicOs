"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { activateAccountAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function ActivatePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("token", token);
    const result = await activateAccountAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(
      `/login?activated=1&clinic=${encodeURIComponent(result.clinicCode ?? "")}&staff=${encodeURIComponent(result.staffCode ?? "")}`
    );
  }

  return (
    <div className="clinic-auth-bg flex min-h-screen items-center justify-center p-4">
      <div className="clinic-auth-card">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-500)]">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Activate your account</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Set your password to get started</p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="New password" name="password" type="password" required minLength={8} />
          <Input label="Confirm password" name="confirmPassword" type="password" required minLength={8} />
          <Button type="submit" loading={loading} className="w-full">
            Activate account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Already activated?{" "}
          <Link href="/login" className="font-medium text-[var(--brand-600)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
