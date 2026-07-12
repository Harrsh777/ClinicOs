"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, LogIn, ShieldCheck, Phone, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { getPublicBookingPath } from "@/lib/portal/public-urls";
import type { PublicClinic } from "@/lib/portal/clinic-public";

type Mode = "login" | "register";
type Step = "phone" | "otp" | "credentials";

export function PatientAuthForm({
  clinic,
  initialMode = "login",
  redirectTo,
  defaultPhone = "",
  startAtCredentials = false,
}: {
  clinic: PublicClinic;
  initialMode?: Mode;
  redirectTo?: string;
  defaultPhone?: string;
  startAtCredentials?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>(startAtCredentials ? "credentials" : "phone");
  const [phone, setPhone] = useState(defaultPhone);
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [usePasswordLogin, setUsePasswordLogin] = useState(false);

  const destination = redirectTo ?? "/patient";
  const bookingPath = getPublicBookingPath(clinic.slug);
  const loginBase = `/${clinic.slug}/login`;

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
        router.push(destination);
        router.refresh();
      }
    });
  }

  async function registerAccount() {
    if (!fullName.trim()) {
      setMessage("Please enter your full name.");
      return;
    }
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

      if (data.requiresLogin) {
        const loginRes = await fetch("/api/portal/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "password", clinicSlug: clinic.slug, phone, password }),
        });
        const loginData = await loginRes.json();
        if (loginData.error) {
          setMessage("Account created. Please sign in with your password.");
          setMode("login");
          setStep("phone");
          setUsePasswordLogin(true);
          return;
        }
      }

      router.push(destination);
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
      router.push(destination);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setStep(startAtCredentials ? "phone" : "phone");
            setMessage(null);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            mode === "login"
              ? "bg-white text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setStep(startAtCredentials ? "credentials" : "phone");
            setMessage(null);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            mode === "register"
              ? "bg-white text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Create Account
        </button>
      </div>

      {message && <Alert variant="error">{message}</Alert>}
      {devCode && (
        <Alert variant="info">
          Dev OTP: <strong>{devCode}</strong>
        </Alert>
      )}

      {step === "phone" && (
        <div className="space-y-4">
          {mode === "login" && (
            <div className="flex rounded-lg border border-[var(--border)] p-1 text-sm">
              <button
                type="button"
                onClick={() => setUsePasswordLogin(false)}
                className={`flex-1 rounded-md py-2 transition ${
                  !usePasswordLogin
                    ? "bg-[var(--brand-50)] font-medium text-[var(--brand-700)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                OTP
              </button>
              <button
                type="button"
                onClick={() => setUsePasswordLogin(true)}
                className={`flex-1 rounded-md py-2 transition ${
                  usePasswordLogin
                    ? "bg-[var(--brand-50)] font-medium text-[var(--brand-700)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                Password
              </button>
            </div>
          )}

          {mode === "register" && (
            <p className="flex items-start gap-2 rounded-lg bg-[var(--brand-50)] px-3 py-2.5 text-sm text-[var(--brand-800)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Verify your mobile number to create a secure patient account at {clinic.name}.
            </p>
          )}

          <Input
            label="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile number"
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
            <Button onClick={sendOtp} loading={pending} className="w-full gap-2">
              <Phone className="h-4 w-4" />
              Send Verification Code
            </Button>
          )}
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Enter the 6-digit code sent to <strong>{phone}</strong>
          </p>
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
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--brand-600)]"
          >
            Change number
          </button>
        </div>
      )}

      {step === "credentials" && (
        <div className="space-y-4">
          {startAtCredentials && (
            <p className="flex items-start gap-2 rounded-lg bg-[var(--success-50)] px-3 py-2.5 text-sm text-[var(--success-800)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Phone verified. Set your password to finish creating your account.
            </p>
          )}
          {!startAtCredentials && phone && (
            <p className="text-sm text-[var(--text-muted)]">
              Creating account for <strong>{phone}</strong>
            </p>
          )}
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
          <Button onClick={registerAccount} loading={pending} className="w-full gap-2">
            <KeyRound className="h-4 w-4" />
            Create Account & Sign In
          </Button>
        </div>
      )}

      <p className="text-center text-sm text-[var(--text-muted)]">
        <Link href={bookingPath} className="font-medium text-[var(--brand-600)] hover:underline">
          Book an appointment
        </Link>
        {" · "}
        <Link href={`/${clinic.slug}`} className="text-[var(--brand-600)] hover:underline">
          Clinic home
        </Link>
      </p>
    </div>
  );
}
