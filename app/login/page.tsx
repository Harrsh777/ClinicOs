"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert } from "@/components/ui/alert";
import "@/components/landing/landing.css";

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

function LogoMark() {
  return (
    <span className="logo-mark">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 4v16M4 12h16" />
      </svg>
    </span>
  );
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
    <div className="landing login-page">
      <div className="login-shell">
        <aside className="login-aside">
          <div className="login-aside-inner">
            <div>
              <div className="eyebrow">Clinic workspace</div>
              <h1>Grow your clinic. Let AI handle everything else.</h1>
              <p className="lead">
                Sign in with your Clinic ID, email, and password. Owners and staff use the same secure login.
              </p>
              <div className="login-perks">
                <div className="login-perk">
                  <strong>Role isolated</strong>
                  <span>Modules scoped to each staff role.</span>
                </div>
                <div className="login-perk">
                  <strong>AI-first</strong>
                  <span>Insights and automation built in.</span>
                </div>
                <div className="login-perk">
                  <strong>Always on</strong>
                  <span>Scheduling, billing, and follow-ups connected.</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="login-main">
          <Link href="/" className="logo">
            <LogoMark />
            ClinicOS
          </Link>

          <div className="login-main-header">
            <h2>Welcome back</h2>
            <p>Sign in to your ClinicOS workspace</p>
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

          <form onSubmit={handleSubmit} className="login-form">
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

            <button type="submit" className="btn-primary login-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="login-footer">
            <Link href="/forgot-password">Forgot password?</Link>
            <p>
              Register your clinic? <Link href="/register">Register here</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="landing login-page" />}>
      <LoginForm />
    </Suspense>
  );
}
