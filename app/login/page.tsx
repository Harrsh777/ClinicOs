"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, Building2, ShieldCheck, Sparkles } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

function formatClinicId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function friendlyLoginError(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("sql") ||
    lower.includes("relation") ||
    lower.includes("schema") ||
    lower.includes("database") ||
    lower.includes("violates")
  ) {
    return "We could not complete sign in right now. Please contact your clinic administrator.";
  }
  return message;
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clinicId, setClinicId] = useState("");
  const [email, setEmail] = useState("");
  const searchParams = useSearchParams();
  const suspended = searchParams.get("error") === "account_suspended";
  const profileMissing = searchParams.get("error") === "profile_missing";
  const activated = searchParams.get("activated") === "1";
  const isPlatform = clinicId.trim().toUpperCase() === "PLATFORM";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("clinicId", formatClinicId(String(formData.get("clinicId") ?? "")));

    if (!isPlatform) {
      formData.set("staffId", String(formData.get("staffId") ?? "").trim().toLowerCase());
    }

    const result = await loginAction(formData);
    if (result?.error) {
      setError(friendlyLoginError(result.error));
      setLoading(false);
    }
  }

  return (
    <div className="clinic-auth-bg flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,.5)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[var(--primary)] to-slate-800 px-8 py-10 text-white lg:flex lg:flex-col lg:justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(20,184,166,.28),transparent_22rem)]" />
          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/15 ring-1 ring-teal-300/30">
                <Activity className="h-5 w-5 text-[var(--secondary)]" />
              </div>
              <div>
                <p className="text-sm font-semibold">ClinicOS</p>
                <p className="text-xs text-slate-400">Premium Healthcare AI Platform</p>
              </div>
            </div>

            <p className="mb-3 inline-flex rounded-full border border-teal-300/20 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-200">
              Enterprise clinic command center
            </p>
            <h1 className="max-w-md text-3xl font-bold leading-snug tracking-[-0.03em]">
              Clinical operations, revenue, and AI workflows in one secure workspace.
            </h1>
            <p className="mt-3 max-w-md text-sm text-slate-300">
              Sign in with your Clinic ID, email, and password. Owners and staff use the same login.
            </p>
          </div>

          <div className="relative mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, title: "Role isolated", text: "Modules scoped to each staff role." },
              { icon: Sparkles, title: "AI-first", text: "Insights and automation built in." },
              { icon: Building2, title: "Branded portals", text: "Patient pages match your clinic." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/10 bg-white/[.06] p-3 backdrop-blur">
                <item.icon className="mb-2 h-4 w-4 text-[var(--secondary)]" />
                <p className="text-xs font-semibold">{item.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-8 sm:px-10 sm:py-10">
          <div className="w-full max-w-lg">
            <div className="mb-6 flex items-center gap-4 lg:mb-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--secondary)] to-[var(--accent)] shadow-[0_0_28px_rgba(20,184,166,.2)]">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Welcome back</h1>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Sign in to your Clinicos workspace</p>
              </div>
            </div>

            {activated && (
              <Alert variant="success" className="mb-4">
                Account activated! Sign in with your Clinic ID, email, and password.
              </Alert>
            )}

            {suspended && (
              <Alert variant="error" className="mb-4">
                Your account has been suspended. Contact your clinic administrator.
              </Alert>
            )}

            {profileMissing && (
              <Alert variant="error" className="mb-4">
                Profile could not be loaded. Please contact your clinic administrator.
              </Alert>
            )}

            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Input
                label="Clinic ID"
                name="clinicId"
                required
                placeholder="CLN-000001 or PLATFORM"
                autoComplete="organization"
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value.toUpperCase())}
                onBlur={(e) => setClinicId(formatClinicId(e.target.value))}
              />

              {isPlatform ? (
                <Input label="Email" name="email" type="email" required placeholder="admin@clinic.com" />
              ) : (
                <Input
                  label="Email"
                  name="staffId"
                  type="email"
                  required
                  placeholder="owner@cityclinic.demo"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => setEmail(e.target.value.trim().toLowerCase())}
                />
              )}

              <PasswordInput label="Password" name="password" required placeholder="••••••••" autoComplete="current-password" />

              <Button type="submit" loading={loading} className="w-full">
                Sign In
              </Button>
            </form>

            <p className="mt-3 text-center text-sm text-[var(--text-muted)]">
              Patient?{" "}
              <Link href="/" className="font-medium text-[var(--secondary)] hover:underline">
                Sign in at your clinic portal
              </Link>
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
              <Link href="/forgot-password" className="font-medium text-[var(--secondary)] hover:underline">
                Forgot password?
              </Link>
              <p>
                Register your clinic?{" "}
                <Link href="/register" className="font-medium text-[var(--secondary)] hover:underline">
                  Register here
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="clinic-auth-bg min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
