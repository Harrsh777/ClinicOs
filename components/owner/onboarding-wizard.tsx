"use client";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  LayoutGrid,
  Stethoscope,
} from "lucide-react";
import {
  saveOnboardingStep1Action,
  saveOnboardingStep2Action,
  saveOnboardingStep3Action,
  completeOnboardingAction,
} from "@/lib/actions/onboarding";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { Clinic } from "@/lib/types/database";

const DEFAULT_DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Orthopedics",
  "Pediatrics",
];

const SERVICES = ["OPD", "IPD", "Lab", "Pharmacy", "Finance"];

const DAYS = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
] as const;

const STEPS = [
  { id: 1, title: "Details", subtitle: "Clinic profile", icon: Building2 },
  { id: 2, title: "Departments", subtitle: "Specialties", icon: Stethoscope },
  { id: 3, title: "Services", subtitle: "Modules", icon: LayoutGrid },
  { id: 4, title: "Plan", subtitle: "Subscription", icon: CreditCard },
] as const;

interface Plan {
  id: string;
  slug: string;
  name: string;
  price_monthly: number;
}

function getDayHours(clinic: Clinic, day: string) {
  const hours = clinic.opening_hours?.[day];
  if (hours === null) return { open: "09:00", close: "18:00", closed: true };
  if (hours && typeof hours === "object") {
    return { open: hours.open ?? "09:00", close: hours.close ?? "18:00", closed: false };
  }
  return { open: "09:00", close: "18:00", closed: day === "sun" };
}

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

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-[var(--border)] pb-5">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

function SelectableChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
        selected
          ? "border-[var(--secondary)] bg-teal-50 text-[var(--secondary)] shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
          : "border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)]"
      )}
    >
      {label}
    </button>
  );
}

function FormFooter({
  onBack,
  backLabel = "Back",
  submitLabel,
  loading,
  showBack = true,
}: {
  onBack?: () => void;
  backLabel?: string;
  submitLabel: string;
  loading: boolean;
  showBack?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
      {showBack && onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} className="sm:px-0">
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Button>
      ) : (
        <div className="hidden sm:block" />
      )}
      <Button type="submit" loading={loading} size="lg" className="w-full sm:w-auto sm:min-w-[160px]">
        {submitLabel}
        {!loading && <ChevronRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export function OnboardingWizard({
  clinic,
  departments,
  plans,
}: {
  clinic: Clinic;
  departments: { id: string; name: string }[];
  plans: Plan[];
}) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDepts, setSelectedDepts] = useState<string[]>(
    departments.map((d) => d.name).length ? departments.map((d) => d.name) : DEFAULT_DEPARTMENTS
  );
  const [selectedServices, setSelectedServices] = useState<string[]>(["OPD"]);
  const [selectedPlan, setSelectedPlan] = useState(plans.find((p) => p.slug === "free")?.slug ?? plans[0]?.slug ?? "free");

  async function handleStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await saveOnboardingStep1Action(new FormData(e.currentTarget));
    if (result?.error) setError(result.error);
    else setStep(2);
    setLoading(false);
  }

  async function handleStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    selectedDepts.forEach((d) => fd.append("departments", d));
    fd.set("customDepartment", (e.currentTarget.elements.namedItem("customDepartment") as HTMLInputElement)?.value ?? "");
    const result = await saveOnboardingStep2Action(fd);
    if (result?.error) setError(result.error);
    else setStep(3);
    setLoading(false);
  }

  async function handleStep3(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    selectedServices.forEach((s) => fd.append("services", s));
    const result = await saveOnboardingStep3Action(fd);
    if (result?.error) setError(result.error);
    else setStep(4);
    setLoading(false);
  }

  async function handleStep4(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("planSlug", selectedPlan);
    selectedServices.forEach((s) => fd.append("services", s));
    const result = await completeOnboardingAction(fd);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  function toggleDept(dept: string) {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  }

  function toggleService(svc: string) {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  }

  return (
    <div className="w-full">
      <StepIndicator step={step} />

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-8">
          <SectionHeader
            title="Clinic details"
            description="Add your clinic's official information and operating hours."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Logo URL (optional)"
                name="logoUrl"
                placeholder="https://example.com/logo.png"
                defaultValue={clinic.logo_url ?? ""}
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Address"
                name="address"
                required
                rows={3}
                placeholder="Street, area, city, pin code"
                defaultValue={clinic.address ?? ""}
              />
            </div>
            <Input
              label="Registration number"
              name="registrationNumber"
              placeholder="e.g. REG-2024-001"
              defaultValue={clinic.registration_number ?? ""}
            />
            <Input
              label="GST number"
              name="gstNumber"
              placeholder="22AAAAA0000A1Z5"
              defaultValue={clinic.gst_number ?? ""}
            />
            <div className="sm:col-span-2">
              <Input
                label="Emergency contact"
                name="emergencyContact"
                placeholder="Name and phone number"
                defaultValue={clinic.emergency_contact ?? ""}
              />
            </div>
            <Input
              label="Expected patients per day"
              name="dailyPatientCapacity"
              type="number"
              min={1}
              placeholder="e.g. 40"
              defaultValue={
                String(
                  clinic.daily_patient_capacity ??
                    ((clinic.settings as Record<string, unknown>)?.queue as Record<string, unknown>)?.dailyPatientCapacity ??
                    50
                )
              }
            />
            <Input
              label="Average fee per patient (₹)"
              name="avgFeePerPatient"
              type="number"
              min={0}
              step="50"
              placeholder="e.g. 500"
              defaultValue={String(
                clinic.consultation_fee_default ??
                  ((clinic.settings as Record<string, unknown>)?.queue as Record<string, unknown>)?.avgFeePerPatient ??
                  500
              )}
            />
          </div>

          <div>
            <p className="mb-3 text-sm text-[var(--text-secondary)]">
              These targets power your Live Queue capacity indicators and revenue estimates on the executive dashboard.
            </p>
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--secondary)]" />
              <p className="clinic-label mb-0">Working hours</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="hidden grid-cols-[minmax(6rem,8rem)_1fr_1fr_5rem] gap-3 border-b border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] sm:grid">
                <span>Day</span>
                <span>Opens</span>
                <span>Closes</span>
                <span className="text-center">Closed</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {DAYS.map(({ key, label, short }) => {
                  const defaults = getDayHours(clinic, key);
                  return (
                    <div
                      key={key}
                      className="group grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(6rem,8rem)_1fr_1fr_5rem] sm:items-center sm:gap-3 has-[:checked]:bg-[var(--surface-1)]/60"
                    >
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        <span className="sm:hidden">{label}</span>
                        <span className="hidden sm:inline">{short}</span>
                      </span>
                      <div className="grid grid-cols-2 gap-3 sm:contents">
                        <div>
                          <label className="mb-1 block text-xs text-[var(--text-muted)] sm:sr-only">Opens</label>
                          <input
                            name={`${key}Open`}
                            type="time"
                            defaultValue={defaults.open}
                            className="clinic-input group-has-[:checked]:opacity-40"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-[var(--text-muted)] sm:sr-only">Closes</label>
                          <input
                            name={`${key}Close`}
                            type="time"
                            defaultValue={defaults.close}
                            className="clinic-input group-has-[:checked]:opacity-40"
                          />
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-center justify-start gap-2 text-sm text-[var(--text-secondary)] sm:justify-center">
                        <input
                          type="checkbox"
                          name={`${key}Closed`}
                          defaultChecked={defaults.closed}
                          className="h-4 w-4 rounded border-[var(--border)] text-[var(--secondary)] focus:ring-[var(--secondary)]"
                        />
                        <span className="sm:sr-only">Closed</span>
                        <span className="sm:hidden">Closed</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <FormFooter submitLabel="Continue" loading={loading} showBack={false} />
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-8">
          <SectionHeader
            title="Departments"
            description="Select the medical specialties available at your clinic. You can add more later."
          />

          <div className="flex flex-wrap gap-2.5">
            {DEFAULT_DEPARTMENTS.map((dept) => (
              <SelectableChip
                key={dept}
                label={dept}
                selected={selectedDepts.includes(dept)}
                onToggle={() => toggleDept(dept)}
              />
            ))}
          </div>

          <Input
            label="Add custom department"
            name="customDepartment"
            placeholder="e.g. Dermatology, ENT, Gynecology"
          />

          <FormFooter
            onBack={() => setStep(1)}
            submitLabel="Continue"
            loading={loading}
          />
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleStep3} className="space-y-8">
          <SectionHeader
            title="Services & modules"
            description="Choose which modules to enable for your clinic. You can change these anytime in settings."
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((svc) => {
              const selected = selectedServices.includes(svc);
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() => toggleService(svc)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-all",
                    selected
                      ? "border-[var(--secondary)] bg-teal-50 shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                      : "border-[var(--border)] bg-[var(--surface-0)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)]"
                  )}
                >
                  <span className="font-medium text-[var(--text-primary)]">{svc}</span>
                  {selected && <CheckCircle2 className="h-5 w-5 text-[var(--secondary)]" />}
                </button>
              );
            })}
          </div>

          <FormFooter
            onBack={() => setStep(2)}
            submitLabel="Continue"
            loading={loading}
          />
        </form>
      )}

      {step === 4 && (
        <form onSubmit={handleStep4} className="space-y-8">
          <SectionHeader
            title="Subscription plan"
            description="Pick a plan to get started. You can upgrade or change your plan later."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => {
              const selected = selectedPlan === plan.slug;
              return (
                <label
                  key={plan.id}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-xl border p-5 transition-all",
                    selected
                      ? "border-[var(--secondary)] bg-teal-50 shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                      : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)]"
                  )}
                >
                  <input
                    type="radio"
                    name="planSlug"
                    value={plan.slug}
                    checked={selected}
                    onChange={() => setSelectedPlan(plan.slug)}
                    className="sr-only"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{plan.name}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        ₹{Number(plan.price_monthly).toLocaleString("en-IN")}
                        <span className="text-[var(--text-muted)]">/month</span>
                      </p>
                    </div>
                    {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--secondary)]" />}
                  </div>
                </label>
              );
            })}
          </div>

          <FormFooter
            onBack={() => setStep(3)}
            submitLabel="Complete setup"
            loading={loading}
          />
        </form>
      )}
    </div>
  );
}
