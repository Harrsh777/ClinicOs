"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { PublicClinic } from "@/lib/portal/clinic-public";

type Mode = "login" | "register";
type Step = "phone" | "otp" | "credentials";

export function PatientAuthForm({
  clinic,
  initialMode = "login",
  redirectTo,
}: {
  clinic: PublicClinic;
  initialMode?: Mode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>(mode === "register" ? "phone" : "phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [usePasswordLogin, setUsePasswordLogin] = useState(false);

  async function sendOtp() {
    setMessage(null);
    const res = await fetch("/api/portal/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicSlug: clinic.slug, phone }),
    });
    const data = await res.json();
    if (data.error) {
      setMessage(data.error);
      return;
    }
    setDevCode(data.devCode);
    setStep("otp");
  }

  async function verifyOtp() {
    setMessage(null);
    const res = await fetch("/api/portal/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicSlug: clinic.slug, phone, code: otp }),
    });
    const data = await res.json();
    if (data.error) {
      setMessage(data.error);
      return;
    }

    if (mode === "register") {
      setStep("credentials");
      return;
    }

    startTransition(async () => {
      const loginRes = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "otp", clinicSlug: clinic.slug, phone }),
      });
      const loginData = await loginRes.json();

      if (loginData.error === "no_account") {
        setMode("register");
        setStep("credentials");
        setMessage("No account yet — set a password to create one.");
        return;
      }
      if (loginData.error) {
        setMessage(loginData.error);
        return;
      }

      if (loginData.tokenHash) {
        const supabase = createClient();
        const { error } = await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: loginData.tokenHash,
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        router.push(redirectTo ?? "/patient");
        router.refresh();
      }
    });
  }

  async function registerAccount() {
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/portal/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicSlug: clinic.slug,
          phone,
          fullName,
          password,
          email: email || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
        return;
      }
      router.push(redirectTo ?? "/patient");
      router.refresh();
    });
  }

  async function passwordLogin() {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "password", clinicSlug: clinic.slug, phone, password }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
        return;
      }
      router.push(redirectTo ?? "/patient");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 rounded-lg bg-[var(--surface-1)] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setStep("phone");
            setMessage(null);
          }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            mode === "login" ? "bg-white shadow text-[var(--text-primary)]" : "text-[var(--text-muted)]"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setStep("phone");
            setMessage(null);
          }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            mode === "register" ? "bg-white shadow text-[var(--text-primary)]" : "text-[var(--text-muted)]"
          }`}
        >
          Create Account
        </button>
      </div>

      {message && <Alert variant="error">{message}</Alert>}
      {devCode && (
        <Alert variant="info">Dev OTP: <strong>{devCode}</strong></Alert>
      )}

      {step === "phone" && (
        <div className="space-y-4">
          {mode === "login" && (
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setUsePasswordLogin(false)}
                className={!usePasswordLogin ? "font-semibold text-[var(--brand-600)]" : "text-[var(--text-muted)]"}
              >
                OTP login
              </button>
              <span className="text-[var(--text-muted)]">·</span>
              <button
                type="button"
                onClick={() => setUsePasswordLogin(true)}
                className={usePasswordLogin ? "font-semibold text-[var(--brand-600)]" : "text-[var(--text-muted)]"}
              >
                Password
              </button>
            </div>
          )}

          <Input
            label="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile"
            inputMode="tel"
            required
          />

          {mode === "login" && usePasswordLogin ? (
            <>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button onClick={passwordLogin} loading={pending} className="w-full">
                Sign In
              </Button>
            </>
          ) : (
            <Button onClick={sendOtp} loading={pending} className="w-full">
              Send OTP
            </Button>
          )}
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <Input
            label="Verification code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit OTP"
            inputMode="numeric"
            required
          />
          <Button onClick={verifyOtp} loading={pending} className="w-full">
            Verify & Continue
          </Button>
          <button type="button" onClick={() => setStep("phone")} className="text-sm text-[var(--text-muted)]">
            Change number
          </button>
        </div>
      )}

      {step === "credentials" && (
        <div className="space-y-4">
          <Input
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="For receipts and reminders"
          />
          <Input
            label="Create password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button onClick={registerAccount} loading={pending} className="w-full">
            Create Account & Sign In
          </Button>
        </div>
      )}

      <p className="text-center text-sm text-[var(--text-muted)]">
        <Link href={`/c/${clinic.slug}/book`} className="text-[var(--brand-600)] hover:underline">
          Book an appointment
        </Link>
        {" · "}
        <Link href={`/c/${clinic.slug}`} className="text-[var(--brand-600)] hover:underline">
          Back to clinic
        </Link>
      </p>
    </div>
  );
}
