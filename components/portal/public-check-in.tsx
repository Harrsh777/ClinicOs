"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { PublicClinic } from "@/lib/portal/clinic-public";

export function PublicCheckIn({ clinic }: { clinic: PublicClinic }) {
  const [bookingId, setBookingId] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"lookup" | "otp">("lookup");
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <h1 className="text-xl font-bold mb-2">Check In</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Enter your booking ID and mobile number to get your queue token.
      </p>

      {message && <Alert variant={message.includes("Token") ? "success" : "error"} className="mb-4">{message}</Alert>}

      {step === "lookup" ? (
        <div className="space-y-4">
          <Input label="Booking ID" value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="BK-260612-1234" />
          <Input label="Mobile Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
          <Button
            className="w-full"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await fetch("/api/portal/otp/send", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ clinicSlug: clinic.slug, phone }),
                });
                const data = await res.json();
                if (data.error) setMessage(data.error);
                else {
                  setDevCode(data.devCode);
                  setStep("otp");
                  setMessage(data.devCode ? `Dev OTP: ${data.devCode}` : "OTP sent");
                }
              })
            }
          >
            Send OTP
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {devCode && <p className="text-xs font-mono text-[var(--brand-600)]">Dev OTP: {devCode}</p>}
          <Input label="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
          <Button
            className="w-full"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const verifyRes = await fetch("/api/portal/otp/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ clinicSlug: clinic.slug, phone, code: otp }),
                });
                const verifyData = await verifyRes.json();
                if (verifyData.error) {
                  setMessage(verifyData.error);
                  return;
                }

                const res = await fetch("/api/portal/check-in", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ clinicSlug: clinic.slug, bookingId, phone }),
                });
                const data = await res.json();
                if (data.error) setMessage(data.error);
                else if (data.bookingId) {
                  window.location.href = `/c/${clinic.slug}/confirmation/${data.bookingId}`;
                }
              })
            }
          >
            Verify & Check In
          </Button>
        </div>
      )}

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        No booking yet?{" "}
        <Link href={`/c/${clinic.slug}/book`} className="text-[var(--brand-600)] font-medium">
          Book now
        </Link>
      </p>
    </Card>
  );
}
