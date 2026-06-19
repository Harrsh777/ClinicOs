"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const suspended = searchParams.get("error") === "account_suspended";
  const profileMissing = searchParams.get("error") === "profile_missing";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Sign in to your ClinicOS account</p>
        </div>

        {suspended && (
          <Alert variant="error" className="mb-4">
            Your account has been suspended. Contact your clinic administrator.
          </Alert>
        )}

        {profileMissing && (
          <Alert variant="error" className="mb-4">
            Profile could not be loaded. Run{" "}
            <code className="text-xs">supabase/fix_profiles_rls.sql</code> in Supabase SQL Editor, then try again.
          </Alert>
        )}

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Clinic ID"
            name="clinicId"
            required
            defaultValue="CLN-DEMO01"
            placeholder="CLN-DEMO01 or PLATFORM"
            autoComplete="organization"
          />
          <p className="text-xs text-[var(--text-muted)] -mt-2">
            Demo: <strong>CLN-DEMO01</strong> · Super admin: <strong>PLATFORM</strong>
          </p>
          <Input label="Email" name="email" type="email" required placeholder="you@clinic.com" />
          <Input label="Password" name="password" type="password" required placeholder="••••••••" />
          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Register your clinic?{" "}
          <Link href="/signup" className="font-medium text-[var(--brand-600)] hover:underline">
            Apply here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
