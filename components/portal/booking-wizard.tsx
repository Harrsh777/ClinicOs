"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { PublicClinic } from "@/lib/portal/clinic-public";

interface Doctor {
  id: string;
  consultation_fee: number | null;
  profiles?: { full_name: string; specialization: string | null } | { full_name: string; specialization: string | null }[];
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type Step = "details" | "otp" | "slot" | "pay";

export function BookingWizard({
  clinic,
  doctors,
  defaultFee,
}: {
  clinic: PublicClinic;
  doctors: Doctor[];
  defaultFee: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const profile = selectedDoctor?.profiles;
  const doctorName = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name;
  const fee = Number(selectedDoctor?.consultation_fee ?? defaultFee);

  useEffect(() => {
    if (doctorId && date) {
      fetch(`/api/portal/slots?clinicSlug=${clinic.slug}&doctorId=${doctorId}&date=${date}`)
        .then((r) => r.json())
        .then((d) => setSlots(d.slots ?? []));
    } else {
      setSlots([]);
    }
  }, [doctorId, date, clinic.slug]);

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
      <div className="mb-6 flex gap-2">
        {(["details", "otp", "slot", "pay"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${step === s || (["details", "otp", "slot", "pay"].indexOf(step) > i) ? "bg-[var(--brand-500)]" : "bg-[var(--surface-2)]"}`}
          />
        ))}
      </div>

      {message && (
        <Alert variant={message.includes("success") || message.includes("Verified") ? "success" : "error"} className="mb-4">
          {message}
        </Alert>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your details</h2>
          <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Raj Kumar" />
          <Input label="Mobile Number" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="9876543210" />
          <Button
            className="w-full"
            loading={pending}
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
          <p className="text-sm text-[var(--text-muted)]">Enter the 6-digit code sent to {phone}</p>
          {devCode && <p className="text-xs font-mono text-[var(--brand-600)]">Dev code: {devCode}</p>}
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
                  setStep("slot");
                }
              })
            }
          >
            Verify & Continue
          </Button>
        </div>
      )}

      {step === "slot" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Choose appointment</h2>
          <Select
            label="Doctor"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            options={[
              { value: "", label: "Select doctor..." },
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
          <Input
            label="Date"
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
          />
          <Select
            label="Time Slot"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            options={[
              { value: "", label: slots.length ? "Select slot..." : "Pick doctor & date first" },
              ...slots.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Button
            className="w-full"
            disabled={!doctorId || !date || !time}
            onClick={() => setStep("pay")}
          >
            Review & Pay ₹{fee}
          </Button>
        </div>
      )}

      {step === "pay" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Confirm & Pay</h2>
          <div className="rounded-lg bg-[var(--surface-2)] p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Patient</span><span>{fullName}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Doctor</span><span>{doctorName}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Date</span><span>{date} at {time}</span></div>
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
                const res = await fetch("/api/portal/book", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ clinicSlug: clinic.slug, fullName, phone, doctorId, date, time }),
                });
                const data = await res.json();
                if (data.error) {
                  setMessage(data.error);
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
                  description: "Consultation Booking",
                  order_id: data.orderId,
                  handler: async (response: {
                    razorpay_order_id: string;
                    razorpay_payment_id: string;
                    razorpay_signature: string;
                  }) => {
                    await fetch("/api/portal/payment/confirm", {
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
                    router.push(`/c/${clinic.slug}/confirmation/${data.bookingId}`);
                  },
                });
                rzp.open();
              })
            }
          >
            Pay ₹{fee} & Get Token
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStep("slot")}>
            Back
          </Button>
        </div>
      )}
    </Card>
  );
}
