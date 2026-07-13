"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Plus,
  Settings,
  Stethoscope,
  Trash2,
} from "lucide-react";
import {
  saveOnboardingProgressAction,
  completeOnboardingAction,
} from "@/lib/actions/onboarding";
import {
  emptyDoctor,
  type OnboardingDoctor,
  type OnboardingProgress,
} from "@/lib/types/onboarding";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Doctors", subtitle: "Doctor information", icon: Stethoscope },
  { id: 2, title: "Clinic", subtitle: "Clinic information", icon: Building2 },
  { id: 3, title: "Fees", subtitle: "Consultation fees", icon: CreditCard },
  { id: 4, title: "Hours", subtitle: "Working hours", icon: Clock },
  { id: 5, title: "Settings", subtitle: "Optional settings", icon: Settings },
] as const;

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Delhi", "Gujarat", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan",
  "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal",
];

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "insurance", label: "Insurance" },
];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--text-primary)]">Step {step} of {STEPS.length}</span>
        <span className="text-[var(--text-secondary)]">{STEPS[step - 1].subtitle}</span>
      </div>
      <div className="flex gap-1.5">
        {STEPS.map((s) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs",
                  done && "border-[var(--secondary)] bg-[var(--secondary)] text-white",
                  active && !done && "border-[var(--secondary)] bg-teal-50 text-[var(--secondary)]",
                  !done && !active && "border-[var(--border)] text-[var(--text-muted)]"
                )}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
              </div>
              <div className={cn("h-1 w-full rounded-full", done || active ? "bg-[var(--secondary)]" : "bg-[var(--surface-2)]")} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DoctorCard({
  doctor,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  doctor: OnboardingDoctor;
  index: number;
  onChange: (d: OnboardingDoctor) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-[var(--text-primary)]">Doctor {index + 1}</p>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-[var(--danger-500)] hover:opacity-80">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" required value={doctor.name} onChange={(e) => onChange({ ...doctor, name: e.target.value })} />
        <Input label="Degree" value={doctor.degree} onChange={(e) => onChange({ ...doctor, degree: e.target.value })} />
        <Input label="Specialization" value={doctor.specialization} onChange={(e) => onChange({ ...doctor, specialization: e.target.value })} />
        <Input label="Experience (years)" type="number" value={doctor.experience} onChange={(e) => onChange({ ...doctor, experience: e.target.value })} />
        <Input label="Registration number" value={doctor.registrationNumber} onChange={(e) => onChange({ ...doctor, registrationNumber: e.target.value })} />
        <Input label="Languages (comma-separated)" value={doctor.languages} onChange={(e) => onChange({ ...doctor, languages: e.target.value })} />
        <Input label="Consultation duration (mins)" type="number" value={doctor.consultationDuration} onChange={(e) => onChange({ ...doctor, consultationDuration: e.target.value })} />
        <Input label="Profile image URL" value={doctor.profileImageUrl} onChange={(e) => onChange({ ...doctor, profileImageUrl: e.target.value })} />
        <div className="sm:col-span-2">
          <Textarea label="Biography" rows={3} value={doctor.biography} onChange={(e) => onChange({ ...doctor, biography: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

export function SetupWizard({ initialProgress }: { initialProgress: OnboardingProgress }) {
  const [progress, setProgress] = useState<OnboardingProgress>(initialProgress);
  const [step, setStep] = useState(initialProgress.currentStep || 1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (next: OnboardingProgress) => {
    setSaveStatus("saving");
    const result = await saveOnboardingProgressAction(next);
    setSaveStatus(result?.error ? "idle" : "saved");
    if (result?.error) setError(result.error);
  }, []);

  const updateProgress = useCallback(
    (updater: (prev: OnboardingProgress) => OnboardingProgress) => {
      setProgress((prev) => {
        const next = updater({ ...prev, currentStep: step });
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persist(next), 800);
        return next;
      });
    },
    [persist, step]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const doctors = progress.step1?.doctors ?? [emptyDoctor()];
  const s2 = progress.step2!;
  const s3 = progress.step3!;
  const s5 = progress.step5!;

  const activeDoctorId = doctors[0]?.id;
  const schedule =
    progress.step4?.schedules?.[activeDoctorId] ?? {
      weekly: Object.fromEntries(
        DAYS.map((d) => [d.key, { open: "09:00", close: "18:00", closed: d.key === "sun" }])
      ),
      slotDuration: "15",
      bufferTime: "5",
      maxDailyPatients: "40",
      emergencySlots: "2",
      holidays: "",
      leave: "",
    };

  function updateSchedule(patch: Partial<typeof schedule>) {
    if (!activeDoctorId) return;
    updateProgress((p) => ({
      ...p,
      step4: {
        schedules: {
          ...p.step4?.schedules,
          [activeDoctorId]: { ...schedule, ...patch },
        },
      },
    }));
  }

  async function goNext() {
    setError(null);
    const nextStep = Math.min(step + 1, STEPS.length);
    const next = { ...progress, currentStep: nextStep };
    setStep(nextStep);
    setProgress(next);
    await persist(next);
  }

  async function goBack() {
    const prevStep = Math.max(step - 1, 1);
    const next = { ...progress, currentStep: prevStep };
    setStep(prevStep);
    setProgress(next);
    await persist(next);
  }

  async function handleComplete() {
    setLoading(true);
    setError(null);
    const result = await completeOnboardingAction({ ...progress, currentStep: 5 });
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <StepIndicator step={step} />

      <div className="mb-4 flex items-center justify-end text-xs text-[var(--text-muted)]">
        {saveStatus === "saving" && "Saving…"}
        {saveStatus === "saved" && "Progress saved"}
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Doctor information</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Add doctors who practice at your clinic for your public profile and booking page. Login accounts
              are created separately from Staff Management after setup.
            </p>
          </div>
          {doctors.map((doc, i) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
              index={i}
              canRemove={doctors.length > 1}
              onChange={(d) =>
                updateProgress((p) => ({
                  ...p,
                  step1: { doctors: doctors.map((x, j) => (j === i ? d : x)) },
                }))
              }
              onRemove={() =>
                updateProgress((p) => ({
                  ...p,
                  step1: { doctors: doctors.filter((_, j) => j !== i) },
                }))
              }
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              updateProgress((p) => ({
                ...p,
                step1: { doctors: [...doctors, emptyDoctor()] },
              }))
            }
          >
            <Plus className="h-4 w-4" /> Add doctor
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Clinic information</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Clinic name" required value={s2.clinicName} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, clinicName: e.target.value } }))} />
            </div>
            <Input label="Logo URL" value={s2.logoUrl} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, logoUrl: e.target.value } }))} />
            <Input label="Phone" value={s2.phone} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, phone: e.target.value } }))} />
            <div className="sm:col-span-2">
              <Textarea label="Address" required rows={2} value={s2.address} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, address: e.target.value } }))} />
            </div>
            <Input label="City" required value={s2.city} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, city: e.target.value } }))} />
            <Select label="State" value={s2.state} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, state: e.target.value } }))} options={INDIAN_STATES.map((s) => ({ value: s, label: s }))} />
            <Input label="Pincode" value={s2.pincode} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, pincode: e.target.value } }))} />
            <Input label="Email" type="email" value={s2.email} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, email: e.target.value } }))} />
            <Input label="Website" value={s2.website} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, website: e.target.value } }))} />
            <Input label="Google Maps link" value={s2.googleMapsLink} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, googleMapsLink: e.target.value } }))} />
            <Input label="Latitude" value={s2.latitude} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, latitude: e.target.value } }))} />
            <Input label="Longitude" value={s2.longitude} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, longitude: e.target.value } }))} />
            <div className="sm:col-span-2">
              <Textarea label="Clinic images (one URL per line)" rows={2} value={s2.images} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, images: e.target.value } }))} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s2.emergencyAvailable} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, emergencyAvailable: e.target.checked } }))} /> Emergency available</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s2.parking} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, parking: e.target.checked } }))} /> Parking</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s2.wheelchairAccess} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, wheelchairAccess: e.target.checked } }))} /> Wheelchair access</label>
            <Input label="Other facilities (comma-separated)" value={s2.otherFacilities} onChange={(e) => updateProgress((p) => ({ ...p, step2: { ...s2, otherFacilities: e.target.value } }))} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Consultation fees</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Normal consultation (₹)" type="number" value={s3.normalConsultation} onChange={(e) => updateProgress((p) => ({ ...p, step3: { ...s3, normalConsultation: e.target.value } }))} />
            <Input label="Emergency consultation (₹)" type="number" value={s3.emergencyConsultation} onChange={(e) => updateProgress((p) => ({ ...p, step3: { ...s3, emergencyConsultation: e.target.value } }))} />
            <Input label="Video consultation (₹)" type="number" value={s3.videoConsultation} onChange={(e) => updateProgress((p) => ({ ...p, step3: { ...s3, videoConsultation: e.target.value } }))} />
            <Input label="Home visit (₹)" type="number" value={s3.homeVisit} onChange={(e) => updateProgress((p) => ({ ...p, step3: { ...s3, homeVisit: e.target.value } }))} />
            <Input label="Follow-up fee (₹)" type="number" value={s3.followUpFee} onChange={(e) => updateProgress((p) => ({ ...p, step3: { ...s3, followUpFee: e.target.value } }))} />
            <Input label="Free follow-up days" type="number" value={s3.freeFollowUpDays} onChange={(e) => updateProgress((p) => ({ ...p, step3: { ...s3, freeFollowUpDays: e.target.value } }))} />
            <div className="sm:col-span-2">
              <Textarea label="Refund policy" rows={2} value={s3.refundPolicy} onChange={(e) => updateProgress((p) => ({ ...p, step3: { ...s3, refundPolicy: e.target.value } }))} />
            </div>
            <div className="sm:col-span-2">
              <Textarea label="Cancellation policy" rows={2} value={s3.cancellationPolicy} onChange={(e) => updateProgress((p) => ({ ...p, step3: { ...s3, cancellationPolicy: e.target.value } }))} />
            </div>
            <div className="sm:col-span-2">
              <p className="clinic-label mb-2">Accepted payment methods</p>
              <div className="flex flex-wrap gap-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={s3.paymentMethods.includes(opt.value)}
                      onChange={(e) => {
                        const methods = e.target.checked
                          ? [...s3.paymentMethods, opt.value]
                          : s3.paymentMethods.filter((m) => m !== opt.value);
                        updateProgress((p) => ({ ...p, step3: { ...s3, paymentMethods: methods } }));
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Working hours — {doctors[0]?.name || "Primary doctor"}</h2>
          <p className="text-sm text-[var(--text-secondary)]">Configure schedule for the first doctor. Additional doctors can be configured later in settings.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Slot duration (mins)" type="number" value={schedule.slotDuration} onChange={(e) => updateSchedule({ slotDuration: e.target.value })} />
            <Input label="Buffer time (mins)" type="number" value={schedule.bufferTime} onChange={(e) => updateSchedule({ bufferTime: e.target.value })} />
            <Input label="Max daily patients" type="number" value={schedule.maxDailyPatients} onChange={(e) => updateSchedule({ maxDailyPatients: e.target.value })} />
            <Input label="Emergency slots" type="number" value={schedule.emergencySlots} onChange={(e) => updateSchedule({ emergencySlots: e.target.value })} />
            <Input label="Holidays (comma-separated dates)" value={schedule.holidays} onChange={(e) => updateSchedule({ holidays: e.target.value })} />
            <Input label="Leave dates" value={schedule.leave} onChange={(e) => updateSchedule({ leave: e.target.value })} />
          </div>
          <div className="rounded-xl border border-[var(--border)] divide-y">
            {DAYS.map(({ key, label }) => {
              const hours = schedule.weekly[key] ?? { open: "09:00", close: "18:00", closed: false };
              return (
                <div key={key} className="grid grid-cols-[6rem_1fr_1fr_4rem] items-center gap-2 px-4 py-2 text-sm">
                  <span>{label}</span>
                  <input type="time" className="clinic-input" value={hours.open} disabled={hours.closed} onChange={(e) => updateSchedule({ weekly: { ...schedule.weekly, [key]: { ...hours, open: e.target.value } } })} />
                  <input type="time" className="clinic-input" value={hours.close} disabled={hours.closed} onChange={(e) => updateSchedule({ weekly: { ...schedule.weekly, [key]: { ...hours, close: e.target.value } } })} />
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={hours.closed} onChange={(e) => updateSchedule({ weekly: { ...schedule.weekly, [key]: { ...hours, closed: e.target.checked } } })} />
                    Off
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Optional settings</h2>
          <p className="text-sm text-[var(--text-secondary)]">These can be configured later in clinic settings.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="UPI ID" value={s5.upi} onChange={(e) => updateProgress((p) => ({ ...p, step5: { ...s5, upi: e.target.value } }))} />
            <Input label="GST number" value={s5.gst} onChange={(e) => updateProgress((p) => ({ ...p, step5: { ...s5, gst: e.target.value } }))} />
            <Input label="Invoice prefix" value={s5.invoicePrefix} onChange={(e) => updateProgress((p) => ({ ...p, step5: { ...s5, invoicePrefix: e.target.value } }))} />
            <Input label="WhatsApp number" value={s5.whatsappNumber} onChange={(e) => updateProgress((p) => ({ ...p, step5: { ...s5, whatsappNumber: e.target.value } }))} />
            <div className="sm:col-span-2">
              <Textarea label="Prescription header" rows={2} value={s5.prescriptionHeader} onChange={(e) => updateProgress((p) => ({ ...p, step5: { ...s5, prescriptionHeader: e.target.value } }))} />
            </div>
            <Input label="Digital signature URL" value={s5.digitalSignatureUrl} onChange={(e) => updateProgress((p) => ({ ...p, step5: { ...s5, digitalSignatureUrl: e.target.value } }))} />
            <Input label="Social links (JSON)" value={s5.socialLinks} onChange={(e) => updateProgress((p) => ({ ...p, step5: { ...s5, socialLinks: e.target.value } }))} />
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:justify-between">
        {step > 1 ? (
          <Button type="button" variant="ghost" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        ) : <div />}
        {step < STEPS.length ? (
          <Button type="button" onClick={goNext}>
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" loading={loading} onClick={handleComplete}>
            Complete setup &amp; unlock dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
