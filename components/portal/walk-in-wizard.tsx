"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { PublicClinic } from "@/lib/portal/clinic-public";
import { Clock, Users } from "lucide-react";
import Link from "next/link";

interface Doctor {
  id: string;
  consultation_fee: number | null;
  profiles?: { full_name: string; specialization: string | null } | { full_name: string; specialization: string | null }[];
}

interface WalkInStatus {
  walkInEnabled: boolean;
  isOpen: boolean;
  hoursMessage: string;
  queueStats: {
    waiting: number;
    estimatedWaitMins: number;
    currentToken: number;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type Step = "details" | "otp" | "doctor" | "pay";

export function WalkInWizard({
  clinic,
  doctors,
  defaultFee,
  initialStatus,
}: {
  clinic: PublicClinic;
  doctors: Doctor[];
  defaultFee: number;
  initialStatus: WalkInStatus | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [status, setStatus] = useState(initialStatus);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const profile = selectedDoctor?.profiles;
  const doctorName = doctorId
    ? Array.isArray(profile)
      ? profile[0]?.full_name
      : profile?.full_name
    : "Shortest queue";
  const fee = Number(selectedDoctor?.consultation_fee ?? defaultFee);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/portal/walk-in/status?clinicSlug=${clinic.slug}`)
        .then((r) => r.json())
        .then((d) => setStatus(d))
        .catch(() => null);
    }, 15000);
    return () => clearInterval(interval);
  }, [clinic.slug]);

  if (!status?.walkInEnabled) {
    return (
      <Card className="text-center">
        <p className="text-[var(--text-muted)]">Online walk-in is not available at this clinic.</p>
        <Link href={`/c/${clinic.slug}/book`} className="clinic-btn clinic-btn-secondary clinic-btn-sm mt-4 inline-flex">
          Book an appointment
        </Link>
      </Card>
    );
  }

  if (!status.isOpen) {
    return (
      <Card className="text-center">
        <Clock className="h-8 w-8 mx-auto text-[var(--warning-500)] mb-3" />
        <p className="font-medium">Walk-in unavailable</p>
        <p className="text-sm text-[var(--text-muted)] mt-2">{status.hoursMessage}</p>
        <Link href={`/c/${clinic.slug}/book`} className="clinic-btn clinic-btn-secondary clinic-btn-sm mt-4 inline-flex">
          Schedule for later
        </Link>
      </Card>
    );
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

  return (
    <Card>
      <div className="mb-6 rounded-lg bg-[var(--surface-2)] p-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--brand-500)]" />
          <span>{status.queueStats.waiting} waiting</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--brand-500)]" />
          <span>~{status.queueStats.estimatedWaitMins} min wait</span>
        </div>
        <div className="text-[var(--text-muted)]">{status.hoursMessage}</div>
      </div>

      <div className="mb-6 flex gap-2">
        {(["details", "otp", "doctor", "pay"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${step === s || (["details", "otp", "doctor", "pay"].indexOf(step) > i) ? "bg-[var(--brand-500)]" : "bg-[var(--surface-2)]"}`}
          />
        ))}
      </div>

      {message && (
        <Alert
          variant={
            message.includes("Verified") || message.includes("Dev OTP") ? "success" : "error"
          }
          className="mb-4"
        >
          {message}
        </Alert>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Join the queue now</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Pay the consultation fee and receive your token instantly — no appointment slot needed.
          </p>
          <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Raj Kumar" />
          <Input label="Mobile Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
          <Button
            className="w-full"
            loading={pending}
            disabled={!fullName.trim() || phone.replace(/\D/g, "").length < 10}
            onClick={() =>
              startTransition(async () => {
                setMessage(null);
                const res = await fetch("/api/portal/otp/send", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ clinicSlug: clinic.slug, phone }),
                });
                const data = await res.json();
                if (data.error) setMessage(data.error);
                else {
                  setDevCode(data.devCode);
                  setMessage(data.devCode ? `Dev OTP: ${data.devCode}` : "OTP sent to your phone");
                  setStep("otp");
                }
              })
            }
          >
            Send OTP
          </Button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Verify mobile</h2>
          {devCode && <p className="text-xs font-mono text-[var(--brand-600)]">Dev OTP: {devCode}</p>}
          <Input label="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} placeholder="123456" />
          <Button
            className="w-full"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await fetch("/api/portal/otp/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ clinicSlug: clinic.slug, phone, code: otp }),
                });
                const data = await res.json();
                if (data.error) setMessage(data.error);
                else {
                  setMessage("Verified!");
                  setStep("doctor");
                }
              })
            }
          >
            Verify & Continue
          </Button>
        </div>
      )}

      {step === "doctor" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Doctor preference</h2>
          <Select
            label="Doctor (optional)"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            options={[
              { value: "", label: "Any doctor — shortest queue" },
              ...doctors.map((d) => {
                const p = d.profiles;
                const name = Array.isArray(p) ? p[0]?.full_name : p?.full_name;
                const spec = Array.isArray(p) ? p[0]?.specialization : p?.specialization;
                return {
                  value: d.id,
                  label: `${name ?? "Doctor"}${spec ? ` — ${spec}` : ""} · ₹${d.consultation_fee ?? defaultFee}`,
                };
              }),
            ]}
          />
          <Button className="w-full" onClick={() => setStep("pay")}>
            Continue · from ₹{doctorId ? fee : defaultFee}
          </Button>
        </div>
      )}

      {step === "pay" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Pay & get token</h2>
          <div className="rounded-lg bg-[var(--surface-2)] p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Patient</span><span>{fullName}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Type</span><span>Walk-in · Today</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Doctor</span><span>{doctorName}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Queue</span><span>{status.queueStats.waiting} ahead (~{status.queueStats.estimatedWaitMins} min)</span></div>
            <div className="flex justify-between font-semibold pt-2 border-t border-[var(--border)]">
              <span>Consultation Fee</span><span>₹{fee}</span>
            </div>
          </div>
          <Button
            className="w-full"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                setMessage(null);
                const res = await fetch("/api/portal/walk-in", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    clinicSlug: clinic.slug,
                    fullName,
                    phone,
                    doctorId: doctorId || undefined,
                  }),
                });
                const data = await res.json();

                if (data.error) {
                  setMessage(data.error);
                  if (data.existingBookingId) {
                    router.push(`/c/${clinic.slug}/confirmation/${data.existingBookingId}`);
                  }
                  return;
                }

                if (data.mockPayment) {
                  router.push(`/c/${clinic.slug}/confirmation/${data.bookingId}`);
                  return;
                }

                const loaded = await loadRazorpay();
                if (!loaded) {
                  setMessage("Could not load payment gateway");
                  return;
                }

                const rzp = new window.Razorpay({
                  key: data.keyId,
                  amount: data.amount,
                  currency: "INR",
                  name: data.clinicName,
                  description: "Walk-in Consultation",
                  order_id: data.orderId,
                  handler: async (response: {
                    razorpay_order_id: string;
                    razorpay_payment_id: string;
                    razorpay_signature: string;
                  }) => {
                    const confirm = await fetch("/api/portal/payment/confirm", {
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
                    const confirmData = await confirm.json();
                    if (confirmData.error) {
                      setMessage(confirmData.error);
                      return;
                    }
                    router.push(`/c/${clinic.slug}/confirmation/${data.bookingId}`);
                  },
                });
                rzp.open();
              })
            }
          >
            Pay ₹{fee} & Join Queue
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStep("doctor")}>
            Back
          </Button>
        </div>
      )}
    </Card>
  );
}
