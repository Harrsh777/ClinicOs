"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck, User } from "lucide-react";
import {
  submitClinicApplicationAction,
  sendSignupEmailOtpAction,
  sendSignupMobileOtpAction,
} from "@/lib/actions/signup";
import {
  clinicStepSchema,
  ownerStepSchema,
  verifyStepSchema,
  zodFieldErrors,
} from "@/lib/validations/clinic-application";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface Plan {
  slug: string;
  name: string;
  price_monthly: number;
}

const CLINIC_TYPES = [
  "Multi-Specialty Hospital",
  "Single Specialty Clinic",
  "Diagnostic Center",
  "Dental Clinic",
  "Ayurveda / Homeopathy",
  "Other",
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const STEPS = [
  { id: 1, title: "Clinic", subtitle: "Basic details", icon: Building2 },
  { id: 2, title: "Owner", subtitle: "Contact & plan", icon: User },
  { id: 3, title: "Verify", subtitle: "OTP codes", icon: ShieldCheck },
  { id: 4, title: "Review", subtitle: "Submit", icon: CheckCircle2 },
] as const;

type FormValues = {
  clinicName: string;
  clinicType: string;
  doctorCount: string;
  city: string;
  state: string;
  phone: string;
  officialEmail: string;
  gst: string;
  website: string;
  ownerName: string;
  ownerEmail: string;
  ownerMobile: string;
  planSlug: string;
  emailOtp: string;
  mobileOtp: string;
  termsAccepted: boolean;
};

const INITIAL_VALUES: FormValues = {
  clinicName: "",
  clinicType: CLINIC_TYPES[0],
  doctorCount: "1",
  city: "",
  state: INDIAN_STATES[0],
  phone: "",
  officialEmail: "",
  gst: "",
  website: "",
  ownerName: "",
  ownerEmail: "",
  ownerMobile: "",
  planSlug: "pro",
  emailOtp: "",
  mobileOtp: "",
  termsAccepted: false,
};

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--text-primary)]">
          Step {step} of {STEPS.length}
        </span>
        <span className="text-[var(--text-secondary)]">{STEPS[step - 1].subtitle}</span>
      </div>
      <div className="flex gap-2">
        {STEPS.map((s) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done && "border-[var(--secondary)] bg-[var(--secondary)] text-white",
                  active && !done && "border-[var(--secondary)] bg-teal-50 text-[var(--secondary)]",
                  !done && !active && "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)]"
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "hidden text-center text-[11px] font-medium sm:block",
                  active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                )}
              >
                {s.title}
              </span>
              <div
                className={cn(
                  "h-1 w-full rounded-full",
                  done || active ? "bg-[var(--secondary)]" : "bg-[var(--surface-2)]"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="text-sm font-medium text-[var(--text-primary)] sm:text-right">{value || "—"}</dd>
    </div>
  );
}

export function ClinicApplicationForm({ plans }: { plans: Plan[] }) {
  const defaultPlan = plans.find((p) => p.slug === "pro")?.slug ?? plans[0]?.slug ?? "pro";
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<FormValues>({ ...INITIAL_VALUES, planSlug: defaultPlan });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState<"email" | "mobile" | null>(null);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [devEmailOtp, setDevEmailOtp] = useState<string>();
  const [devMobileOtp, setDevMobileOtp] = useState<string>();

  const planOptions = useMemo(
    () =>
      plans.map((p) => ({
        value: p.slug,
        label: `${p.name} — ₹${Number(p.price_monthly).toLocaleString("en-IN")}/mo`,
      })),
    [plans]
  );

  const selectedPlan = plans.find((p) => p.slug === values.planSlug);

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateStep(targetStep: number): boolean {
    setFieldErrors({});
    setError(null);

    if (targetStep === 1) {
      const result = clinicStepSchema.safeParse(values);
      if (!result.success) {
        setFieldErrors(zodFieldErrors(result.error));
        return false;
      }
    }

    if (targetStep === 2) {
      const result = ownerStepSchema.safeParse(values);
      if (!result.success) {
        setFieldErrors(zodFieldErrors(result.error));
        return false;
      }
    }

    if (targetStep === 3) {
      const result = verifyStepSchema.safeParse(values);
      if (!result.success) {
        setFieldErrors(zodFieldErrors(result.error));
        return false;
      }
    }

    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function goBack() {
    setError(null);
    setFieldErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  async function sendEmailOtp() {
    const emailCheck = ownerStepSchema.pick({ ownerEmail: true }).safeParse({ ownerEmail: values.ownerEmail });
    if (!emailCheck.success) {
      setFieldErrors({ ownerEmail: zodFieldErrors(emailCheck.error).ownerEmail ?? "Enter a valid email" });
      return;
    }

    setOtpLoading("email");
    setError(null);
    const result = await sendSignupEmailOtpAction(values.ownerEmail);
    setOtpLoading(null);

    if (result && "error" in result) setError(result.error);
    else {
      setEmailOtpSent(true);
      setDevEmailOtp(result && "devCode" in result ? result.devCode : undefined);
    }
  }

  async function sendMobileOtp() {
    const mobileCheck = ownerStepSchema.pick({ ownerMobile: true }).safeParse({ ownerMobile: values.ownerMobile });
    if (!mobileCheck.success) {
      setFieldErrors({
        ownerMobile: zodFieldErrors(mobileCheck.error).ownerMobile ?? "Enter a valid mobile number",
      });
      return;
    }

    setOtpLoading("mobile");
    setError(null);
    const result = await sendSignupMobileOtpAction(values.ownerMobile);
    setOtpLoading(null);

    if (result && "error" in result) setError(result.error);
    else {
      setMobileOtpSent(true);
      setDevMobileOtp(result && "devCode" in result ? result.devCode : undefined);
    }
  }

  async function handleSubmit() {
    if (!values.termsAccepted) {
      setFieldErrors({ termsAccepted: "You must accept the terms to continue" });
      return;
    }
    if (!validateStep(3)) {
      setStep(3);
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    Object.entries(values).forEach(([key, val]) => {
      if (key === "termsAccepted") {
        if (val) formData.set(key, "on");
      } else {
        formData.set(key, String(val));
      }
    });

    const result = await submitClinicApplicationAction(formData);
    if (result?.error) setError(result.error);
    else setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg py-4 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <Alert variant="success">
          <p className="font-semibold">Application submitted — Status: Pending Approval</p>
          <p className="mt-1 text-sm">
            Our admin team will review your request and email you an activation link once approved.
          </p>
        </Alert>
        <Link
          href="/login"
          className="mt-6 inline-flex text-sm font-medium text-[var(--secondary)] hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <StepIndicator step={step} />

      {error && (
        <Alert variant="error" className="mb-5">
          {error}
        </Alert>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Clinic information</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Tell us about your clinic so we can set up your workspace.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Clinic name"
                name="clinicName"
                required
                placeholder="City Health Clinic"
                value={values.clinicName}
                onChange={(e) => updateField("clinicName", e.target.value)}
                error={fieldErrors.clinicName}
              />
            </div>
            <Select
              label="Clinic type"
              name="clinicType"
              required
              value={values.clinicType}
              onChange={(e) => updateField("clinicType", e.target.value)}
              error={fieldErrors.clinicType}
              options={CLINIC_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <Input
              label="Number of doctors"
              name="doctorCount"
              type="number"
              required
              min={1}
              max={500}
              value={values.doctorCount}
              onChange={(e) => updateField("doctorCount", e.target.value)}
              error={fieldErrors.doctorCount}
            />
            <Input
              label="City"
              name="city"
              required
              placeholder="Mumbai"
              value={values.city}
              onChange={(e) => updateField("city", e.target.value)}
              error={fieldErrors.city}
            />
            <Select
              label="State"
              name="state"
              required
              value={values.state}
              onChange={(e) => updateField("state", e.target.value)}
              error={fieldErrors.state}
              options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            />
            <Input
              label="Clinic phone"
              name="phone"
              required
              placeholder="9876543210"
              value={values.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              error={fieldErrors.phone}
            />
            <Input
              label="Official email"
              name="officialEmail"
              type="email"
              required
              placeholder="info@clinic.com"
              value={values.officialEmail}
              onChange={(e) => updateField("officialEmail", e.target.value)}
              error={fieldErrors.officialEmail}
            />
            <Input
              label="GST (optional)"
              name="gst"
              placeholder="22AAAAA0000A1Z5"
              value={values.gst}
              onChange={(e) => updateField("gst", e.target.value.toUpperCase())}
              error={fieldErrors.gst}
            />
            <Input
              label="Website (optional)"
              name="website"
              type="url"
              placeholder="https://yourclinic.com"
              value={values.website}
              onChange={(e) => updateField("website", e.target.value)}
              error={fieldErrors.website}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Owner information</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Who should we contact about this application?
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              name="ownerName"
              required
              placeholder="Dr. Anita Mehta"
              value={values.ownerName}
              onChange={(e) => updateField("ownerName", e.target.value)}
              error={fieldErrors.ownerName}
            />
            <Input
              label="Email"
              name="ownerEmail"
              type="email"
              required
              placeholder="owner@yourclinic.com"
              value={values.ownerEmail}
              onChange={(e) => updateField("ownerEmail", e.target.value)}
              error={fieldErrors.ownerEmail}
            />
            <Input
              label="Mobile number"
              name="ownerMobile"
              required
              placeholder="9876543210"
              value={values.ownerMobile}
              onChange={(e) => updateField("ownerMobile", e.target.value)}
              error={fieldErrors.ownerMobile}
            />
            <Select
              label="Plan preference"
              name="planSlug"
              value={values.planSlug}
              onChange={(e) => updateField("planSlug", e.target.value)}
              error={fieldErrors.planSlug}
              options={planOptions.length ? planOptions : [{ value: "pro", label: "Pro" }]}
            />
          </div>
          {selectedPlan && (
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-sm text-[var(--text-secondary)]">
              Selected plan: <span className="font-semibold text-[var(--text-primary)]">{selectedPlan.name}</span> at
              ₹{Number(selectedPlan.price_monthly).toLocaleString("en-IN")}/month. You can change this during onboarding.
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Verify your identity</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              We&apos;ll send one-time codes to <span className="font-medium text-[var(--text-primary)]">{values.ownerEmail}</span> and{" "}
              <span className="font-medium text-[var(--text-primary)]">{values.ownerMobile}</span>.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">Email verification</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input
                  label="Email OTP"
                  name="emailOtp"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={values.emailOtp}
                  onChange={(e) => updateField("emailOtp", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  error={fieldErrors.emailOtp}
                />
                <Button
                  type="button"
                  variant="secondary"
                  loading={otpLoading === "email"}
                  onClick={sendEmailOtp}
                  className="shrink-0 sm:mb-0.5"
                >
                  {emailOtpSent ? "Resend" : "Send code"}
                </Button>
              </div>
              {devEmailOtp && <p className="mt-2 text-xs text-[var(--text-muted)]">Dev OTP: {devEmailOtp}</p>}
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">Mobile verification</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input
                  label="Mobile OTP"
                  name="mobileOtp"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={values.mobileOtp}
                  onChange={(e) => updateField("mobileOtp", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  error={fieldErrors.mobileOtp}
                />
                <Button
                  type="button"
                  variant="secondary"
                  loading={otpLoading === "mobile"}
                  onClick={sendMobileOtp}
                  className="shrink-0 sm:mb-0.5"
                >
                  {mobileOtpSent ? "Resend" : "Send code"}
                </Button>
              </div>
              {devMobileOtp && <p className="mt-2 text-xs text-[var(--text-muted)]">Dev OTP: {devMobileOtp}</p>}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Review your application</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Confirm everything looks correct before submitting.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Clinic</h3>
              <dl className="space-y-2.5">
                <ReviewRow label="Name" value={values.clinicName} />
                <ReviewRow label="Type" value={values.clinicType} />
                <ReviewRow label="Doctors" value={values.doctorCount} />
                <ReviewRow label="Location" value={`${values.city}, ${values.state}`} />
                <ReviewRow label="Phone" value={values.phone} />
                <ReviewRow label="Email" value={values.officialEmail} />
                {values.gst && <ReviewRow label="GST" value={values.gst} />}
                {values.website && <ReviewRow label="Website" value={values.website} />}
              </dl>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Owner &amp; plan</h3>
              <dl className="space-y-2.5">
                <ReviewRow label="Name" value={values.ownerName} />
                <ReviewRow label="Email" value={values.ownerEmail} />
                <ReviewRow label="Mobile" value={values.ownerMobile} />
                <ReviewRow
                  label="Plan"
                  value={selectedPlan ? `${selectedPlan.name} (₹${Number(selectedPlan.price_monthly).toLocaleString("en-IN")}/mo)` : values.planSlug}
                />
              </dl>
            </div>
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors",
              fieldErrors.termsAccepted
                ? "border-[var(--danger-500)] bg-red-50/50"
                : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)]"
            )}
          >
            <input
              type="checkbox"
              checked={values.termsAccepted}
              onChange={(e) => updateField("termsAccepted", e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-[var(--text-secondary)]">
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-[var(--secondary)] hover:underline">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-[var(--secondary)] hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>
          {fieldErrors.termsAccepted && (
            <p className="text-xs text-[var(--danger-500)]">{fieldErrors.termsAccepted}</p>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-sm text-[var(--text-muted)] sm:text-left">
          Already have credentials?{" "}
          <Link href="/login" className="font-medium text-[var(--secondary)] hover:underline">
            Sign in
          </Link>
        </p>
        <div className="flex gap-3">
          {step > 1 && (
            <Button type="button" variant="secondary" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {step < STEPS.length ? (
            <Button type="button" onClick={goNext} className="flex-1 sm:flex-none">
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" loading={loading} onClick={handleSubmit} className="flex-1 sm:flex-none">
              Submit application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
