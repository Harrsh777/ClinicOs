"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Stethoscope,
  Calendar,
  Clock,
  User,
  CreditCard,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { PublicClinic } from "@/lib/portal/clinic-public";
import type { PublicDoctor } from "@/components/portal/public-booking-showcase";
import { getPublicLoginPath } from "@/lib/portal/public-urls";
import Link from "next/link";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const STEPS = [
  { key: "Doctor", label: "Doctor", icon: Stethoscope },
  { key: "Type", label: "Type", icon: Sparkles },
  { key: "Date", label: "Date", icon: Calendar },
  { key: "Slot", label: "Time", icon: Clock },
  { key: "Details", label: "Details", icon: User },
  { key: "Payment", label: "Payment", icon: CreditCard },
  { key: "Confirm", label: "Done", icon: CheckCircle2 },
] as const;

type Step = (typeof STEPS)[number]["key"];

const CONSULTATION_TYPES = [
  { value: "normal", label: "Normal Consultation", desc: "Standard in-clinic visit" },
  { value: "emergency", label: "Emergency Consultation", desc: "Priority same-day care" },
  { value: "video", label: "Video Consultation", desc: "Remote consultation via video" },
] as const;

function doctorName(d: PublicDoctor) {
  const p = d.profiles;
  const profile = Array.isArray(p) ? p[0] : p;
  return profile?.full_name ?? "Doctor";
}

function doctorSpec(d: PublicDoctor) {
  const p = d.profiles;
  const profile = Array.isArray(p) ? p[0] : p;
  return d.specialization ?? profile?.specialization ?? "General Physician";
}

function doctorAvatar(d: PublicDoctor) {
  const p = d.profiles;
  const profile = Array.isArray(p) ? p[0] : p;
  return profile?.avatar_url ?? null;
}

export function Phase2BookingWizard({
  clinic,
  doctors,
}: {
  clinic: PublicClinic;
  doctors: PublicDoctor[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("Doctor");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [doctorId, setDoctorId] = useState("");
  const [consultationType, setConsultationType] = useState<"normal" | "emergency" | "video">("normal");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState<"online" | "at_clinic">("online");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [currentMedicines, setCurrentMedicines] = useState("");
  const [occupation, setOccupation] = useState("");
  const [insurance, setInsurance] = useState("");
  const [notes, setNotes] = useState("");
  const [isReturning, setIsReturning] = useState(false);
  const [returningCode, setReturningCode] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<File[]>([]);

  const [confirmation, setConfirmation] = useState<{
    bookingId: string;
    appointmentNumber?: string;
    receiptNumber?: string;
    patientCode?: string;
    fee?: number;
  } | null>(null);

  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const fee =
    consultationType === "emergency"
      ? clinic.fees.emergency ?? clinic.fees.normal * 1.5
      : consultationType === "video"
        ? clinic.fees.video ?? clinic.fees.normal * 0.8
        : Number(selectedDoctor?.consultation_fee ?? clinic.fees.normal);

  useEffect(() => {
    if (doctorId) {
      fetch(`/api/portal/available-dates?clinicSlug=${clinic.slug}&doctorId=${doctorId}`)
        .then((r) => r.json())
        .then((d) => setAvailableDates(d.dates ?? []));
    }
  }, [doctorId, clinic.slug]);

  useEffect(() => {
    let cancelled = false;
    if (doctorId && date) {
      fetch(
        `/api/portal/slots?clinicSlug=${clinic.slug}&doctorId=${doctorId}&date=${date}&consultationType=${consultationType}`
      )
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setSlots(d.slots ?? []);
        });
    } else {
      Promise.resolve().then(() => {
        if (!cancelled) setSlots([]);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [doctorId, date, consultationType, clinic.slug]);

  async function lookupPatient() {
    if (phone.length < 10) return;
    const res = await fetch("/api/portal/patient-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicSlug: clinic.slug, phone, email }),
    });
    const data = await res.json();
    if (data.found && data.patient) {
      const p = data.patient;
      setIsReturning(true);
      setPatientId(p.id);
      setReturningCode(p.patient_code ?? null);
      setFullName(p.full_name ?? fullName);
      setEmail(p.email ?? email);
      setGender(p.gender ?? gender);
      setBloodGroup(p.blood_group ?? bloodGroup);
      if (p.age) setAge(String(p.age));
      if (p.address) setAddress(p.address);
      if (p.occupation) setOccupation(p.occupation);
      if (p.insurance) setInsurance(p.insurance);
      if (p.medical_conditions) setMedicalConditions(p.medical_conditions);
      if (p.allergies) setAllergies(p.allergies);
    } else {
      setIsReturning(false);
      setPatientId(null);
      setReturningCode(null);
    }
  }

  function loadRazorpay(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  function stepIndex(s: Step) {
    return STEPS.findIndex((st) => st.key === s);
  }

  function goNext() {
    const idx = stepIndex(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  }

  function goBack() {
    const idx = stepIndex(step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  }

  async function uploadReports(pid: string) {
    for (const file of uploads) {
      const fd = new FormData();
      fd.set("clinicSlug", clinic.slug);
      fd.set("patientId", pid);
      fd.set("file", file);
      await fetch("/api/portal/upload-report", { method: "POST", body: fd });
    }
  }

  function submitBooking() {
    startTransition(async () => {
      setMessage(null);
      const payload = {
        clinicSlug: clinic.slug,
        doctorId,
        date,
        time,
        consultationType,
        paymentMode,
        fullName,
        phone,
        email,
        age: age ? parseInt(age, 10) : undefined,
        gender,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        bloodGroup,
        address,
        symptoms,
        medicalConditions,
        allergies,
        currentMedicines,
        occupation,
        insurance,
        notes,
      };

      const res = await fetch("/api/portal/public-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
        return;
      }

      const pid = data.patientId ?? patientId;
      if (uploads.length > 0 && pid) {
        await uploadReports(pid);
      }

      if (data.payAtClinic || data.mockPayment) {
        setConfirmation({
          bookingId: data.bookingId,
          appointmentNumber: data.appointmentNumber,
          receiptNumber: data.receiptNumber,
          patientCode: data.patientCode,
          fee: data.fee,
        });
        setStep("Confirm");
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        setMessage("Could not load payment gateway. Please try again or choose pay at clinic.");
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: "INR",
        name: data.clinicName,
        description: "Consultation Booking",
        order_id: data.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const confirmRes = await fetch("/api/portal/payment/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visitId: data.visitId,
              billId: data.billId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const confirmData = await confirmRes.json();
          if (!confirmRes.ok || confirmData.error) {
            setMessage(confirmData.error ?? "Payment verification failed. Contact the clinic with your booking ID.");
            return;
          }
          router.push(`/c/${clinic.slug}/confirmation/${data.bookingId}`);
        },
        modal: {
          ondismiss: () => setMessage("Payment was cancelled. Your slot is held briefly — complete payment or book again."),
        },
      });
      rzp.open();
    });
  }

  const currentStepIdx = stepIndex(step);

  return (
    <Card className="!overflow-hidden !p-0 shadow-md ring-1 ring-[var(--border)]">
        {/* Step progress */}
        <div className="border-b border-[var(--border)] bg-[var(--surface-1)] px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = currentStepIdx > i;
              const active = currentStepIdx === i;
              return (
                <div key={s.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-all sm:h-9 sm:w-9",
                      done && "bg-[var(--brand-500)] text-white",
                      active && !done && "bg-[var(--brand-500)] text-white ring-4 ring-[var(--brand-100)]",
                      !done && !active && "bg-[var(--surface-2)] text-[var(--text-muted)]"
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span
                    className={cn(
                      "hidden text-[10px] font-medium sm:block",
                      active ? "text-[var(--brand-600)]" : "text-[var(--text-muted)]"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {message && (
            <Alert variant="error" className="mb-4">
              {message}
            </Alert>
          )}
          {isReturning && step === "Details" && (
            <Alert variant="success" className="mb-4">
              Welcome back{returningCode ? ` (${returningCode})` : ""}! Your profile will be updated with any new details.
            </Alert>
          )}

          {step === "Doctor" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Choose your doctor</h2>
                <p className="text-sm text-[var(--text-muted)]">Select a specialist for your consultation</p>
              </div>
              <div className="grid gap-3">
                {doctors.map((d) => {
                  const avatar = doctorAvatar(d);
                  const selected = doctorId === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDoctorId(d.id)}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                        selected
                          ? "border-[var(--brand-500)] bg-[var(--brand-50)] shadow-sm"
                          : "border-[var(--border)] hover:border-[var(--brand-200)] hover:bg-[var(--surface-1)]"
                      )}
                    >
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-100)] text-lg font-semibold text-[var(--brand-700)]">
                          {doctorName(d).charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{doctorName(d)}</p>
                        <p className="text-sm text-[var(--brand-600)]">{doctorSpec(d)}</p>
                        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                          ₹{d.consultation_fee ?? clinic.fees.normal} per visit
                        </p>
                      </div>
                      {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand-500)]" />}
                    </button>
                  );
                })}
              </div>
              <Button className="w-full" disabled={!doctorId} onClick={goNext}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "Type" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Consultation type</h2>
                <p className="text-sm text-[var(--text-muted)]">Choose how you&apos;d like to be seen</p>
              </div>
              {CONSULTATION_TYPES.map((t) => {
                const typeFee =
                  t.value === "normal"
                    ? fee
                    : t.value === "emergency"
                      ? (clinic.fees.emergency ?? clinic.fees.normal * 1.5)
                      : (clinic.fees.video ?? clinic.fees.normal * 0.8);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setConsultationType(t.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border p-4 transition-all",
                      consultationType === t.value
                        ? "border-[var(--brand-500)] bg-[var(--brand-50)]"
                        : "border-[var(--border)] hover:bg-[var(--surface-1)]"
                    )}
                  >
                    <div className="text-left">
                      <span className="font-medium">{t.label}</span>
                      <p className="text-xs text-[var(--text-muted)]">{t.desc}</p>
                    </div>
                    <span className="font-semibold text-[var(--brand-600)]">₹{typeFee}</span>
                  </button>
                );
              })}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" onClick={goNext}>
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "Date" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Pick a date</h2>
                <p className="text-sm text-[var(--text-muted)]">Available dates for {selectedDoctor ? doctorName(selectedDoctor) : "your doctor"}</p>
              </div>
              {availableDates.length === 0 ? (
                <div className="rounded-lg bg-[var(--surface-2)] p-6 text-center text-sm text-[var(--text-muted)]">
                  No available dates. Please try another doctor.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {availableDates.slice(0, 28).map((d) => {
                    const dt = new Date(d + "T12:00:00");
                    const isSelected = date === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDate(d);
                          setTime("");
                        }}
                        className={cn(
                          "flex flex-col items-center rounded-xl border px-2 py-3 transition-all",
                          isSelected
                            ? "border-[var(--brand-500)] bg-[var(--brand-50)] font-medium shadow-sm"
                            : "border-[var(--border)] hover:border-[var(--brand-200)]"
                        )}
                      >
                        <span className="text-[10px] uppercase text-[var(--text-muted)]">
                          {dt.toLocaleDateString("en-IN", { weekday: "short" })}
                        </span>
                        <span className="text-lg font-semibold">{dt.getDate()}</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {dt.toLocaleDateString("en-IN", { month: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" disabled={!date} onClick={goNext}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === "Slot" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Select a time</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {date &&
                    new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                </p>
              </div>
              {slots.length === 0 ? (
                <div className="rounded-lg bg-[var(--surface-2)] p-6 text-center text-sm text-[var(--text-muted)]">
                  No slots available on this date. Please pick another date.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTime(s)}
                      className={cn(
                        "rounded-xl border py-2.5 text-sm font-medium transition-all",
                        time === s
                          ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                          : "border-[var(--border)] hover:border-[var(--brand-200)]"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" disabled={!time} onClick={goNext}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === "Details" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Patient details</h2>
                <p className="text-sm text-[var(--text-muted)]">Enter your information for the visit</p>
              </div>

              <fieldset className="space-y-3">
                <legend className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Personal information</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Full name *" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  <Input
                    label="Phone *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={lookupPatient}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={lookupPatient}
                  />
                  <Input label="Age *" type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
                  <Select
                    label="Gender *"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    options={[
                      { value: "", label: "Select..." },
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                  <Input label="Blood group" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} />
                  <Input label="Occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                  <Input label="Insurance" value={insurance} onChange={(e) => setInsurance(e.target.value)} />
                  <div className="sm:col-span-2">
                    <Textarea label="Address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Health information</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Height (cm)" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
                  <Input label="Weight (kg)" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                  <div className="sm:col-span-2">
                    <Textarea label="Symptoms *" rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Describe your current symptoms..." />
                  </div>
                  <Input label="Medical conditions" value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} placeholder="Diabetes, hypertension..." />
                  <Input label="Allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Penicillin, peanuts..." />
                  <div className="sm:col-span-2">
                    <Input label="Current medicines" value={currentMedicines} onChange={(e) => setCurrentMedicines(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Textarea label="Additional notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Medical reports</legend>
                <label
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors",
                    uploads.length > 0
                      ? "border-[var(--brand-300)] bg-[var(--brand-50)]"
                      : "border-[var(--border)] hover:border-[var(--brand-300)] hover:bg-[var(--surface-1)]"
                  )}
                >
                  <Upload className="mb-2 h-8 w-8 text-[var(--text-muted)]" />
                  <span className="text-sm font-medium">Upload reports (PDF, JPG, PNG)</span>
                  <span className="mt-1 text-xs text-[var(--text-muted)]">Click to browse or drag files here</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    className="sr-only"
                    onChange={(e) => setUploads(Array.from(e.target.files ?? []))}
                  />
                </label>
                {uploads.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {uploads.map((f) => (
                      <li key={f.name} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <FileText className="h-3.5 w-3.5" /> {f.name}
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!fullName || !phone || !age || !gender}
                  onClick={goNext}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === "Payment" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Review & pay</h2>
                <p className="text-sm text-[var(--text-muted)]">Confirm your booking details</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-4 text-sm space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Doctor</span>
                  <span className="font-medium">{selectedDoctor ? doctorName(selectedDoctor) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Date & time</span>
                  <span className="font-medium">
                    {date} at {time}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Type</span>
                  <span className="font-medium capitalize">{consultationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Patient</span>
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--border)] pt-2.5 text-base">
                  <span className="font-semibold">Consultation fee</span>
                  <span className="font-bold text-[var(--brand-600)]">₹{fee}</span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode("online")}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    paymentMode === "online" && "border-[var(--brand-500)] bg-[var(--brand-50)] ring-1 ring-[var(--brand-200)]"
                  )}
                >
                  <p className="font-medium">Pay Online</p>
                  <p className="text-xs text-[var(--text-muted)]">UPI, Card, Netbanking via Razorpay</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("at_clinic")}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    paymentMode === "at_clinic" && "border-[var(--brand-500)] bg-[var(--brand-50)] ring-1 ring-[var(--brand-200)]"
                  )}
                >
                  <p className="font-medium">Pay at Clinic</p>
                  <p className="text-xs text-[var(--text-muted)]">Pay when you arrive for your visit</p>
                </button>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" loading={pending} onClick={submitBooking}>
                  {paymentMode === "online" ? `Pay ₹${fee} & Confirm` : "Confirm Booking"}
                </Button>
              </div>
            </div>
          )}

          {step === "Confirm" && confirmation && (
            <div className="space-y-5 py-2 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-50)]">
                <CheckCircle2 className="h-9 w-9 text-[var(--success-600)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--success-700)]">Booking Confirmed!</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Your appointment has been scheduled successfully</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-5 text-left text-sm space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Booking ID</span>
                  <span className="font-mono font-medium">{confirmation.bookingId}</span>
                </div>
                {confirmation.appointmentNumber && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Appointment #</span>
                    <span className="font-mono font-medium">{confirmation.appointmentNumber}</span>
                  </div>
                )}
                {confirmation.receiptNumber && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Receipt #</span>
                    <span className="font-mono font-medium">{confirmation.receiptNumber}</span>
                  </div>
                )}
                {confirmation.patientCode && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Patient ID</span>
                    <span className="font-mono font-medium">{confirmation.patientCode}</span>
                  </div>
                )}
                {confirmation.fee != null && (
                  <div className="flex justify-between border-t border-[var(--border)] pt-2.5">
                    <span className="text-[var(--text-muted)]">Amount due at clinic</span>
                    <span className="font-semibold">₹{confirmation.fee}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Show your booking ID at reception. Your QR code is available on the confirmation page.
              </p>
              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => router.push(`/${clinic.slug}/confirmation/${confirmation.bookingId}`)}>
                  View QR & Receipt
                </Button>
                <Link
                  href={getPublicLoginPath(clinic.slug, { mode: "register", phone })}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--brand-200)] bg-[var(--brand-50)] px-4 py-2.5 text-sm font-medium text-[var(--brand-700)] transition hover:bg-[var(--brand-100)]"
                >
                  Create account to track this visit
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>
  );
}
