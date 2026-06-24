"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function ResetPasswordPage() {
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
    const result = await resetPasswordAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/login?activated=1");
  }

  return (
    <div className="clinic-auth-bg flex min-h-screen items-center justify-center p-4">
      <div className="clinic-auth-card">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-500)]">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Reset password</h1>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="New password" name="password" type="password" required minLength={8} />
          <Input label="Confirm password" name="confirmPassword" type="password" required minLength={8} />
          <Button type="submit" loading={loading} className="w-full">
            Update password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-[var(--brand-600)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
