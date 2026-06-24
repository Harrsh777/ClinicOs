"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await requestPasswordResetAction(new FormData(e.currentTarget));
    if (result?.error) setError(result.error);
    else setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="clinic-auth-bg flex min-h-screen items-center justify-center p-4">
      <div className="clinic-auth-card">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-500)]">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Forgot password</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Enter Clinic ID, Staff ID, and your registered email. We&apos;ll send a reset link after email OTP verification.
          </p>
        </div>

        {success ? (
          <Alert variant="success">
            If an account matches, a password reset link has been sent to your email.
            <Link href="/login" className="mt-3 block font-medium text-[var(--brand-600)] hover:underline">
              Back to sign in
            </Link>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <Input label="Clinic ID" name="clinicId" required placeholder="CLN-1024" />
            <Input label="Staff ID" name="staffId" required placeholder="DOC-0001" />
            <Input label="Registered email" name="email" type="email" required />
            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
