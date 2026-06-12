"use client";

import { buildQRPayload } from "@/lib/visits/qr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode } from "lucide-react";

interface VisitTokenCardProps {
  visit: {
    visit_code: string;
    booking_id: string;
    token_label: string | null;
    payment_status: string;
    check_in_status: string;
    qr_signature: string;
  };
}

export function VisitTokenCard({ visit }: VisitTokenCardProps) {
  const qrPayload = buildQRPayload(visit.visit_code);
  const qrData = JSON.stringify(qrPayload);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

  return (
    <Card className="max-w-sm mx-auto text-center border-2 border-[var(--brand-200)]">
      <div className="flex items-center justify-center gap-2 mb-4">
        <QrCode className="h-5 w-5 text-[var(--brand-500)]" />
        <h3 className="font-semibold">Your Visit Pass</h3>
      </div>

      {visit.token_label ? (
        <p className="clinic-token-display text-4xl">{visit.token_label}</p>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Token assigned at check-in</p>
      )}

      <div className="inline-block p-3 bg-white rounded-[var(--radius-lg)] border border-[var(--border)] my-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="Secure check-in QR code" width={180} height={180} className="mx-auto" />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between px-4">
          <span className="text-[var(--text-muted)]">Booking ID</span>
          <span className="font-mono font-medium">{visit.booking_id}</span>
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <Badge variant={visit.payment_status === "pending" ? "warning" : "success"}>
            {visit.payment_status === "pending" ? "Payment Pending" : "Ready"}
          </Badge>
          <Badge variant="neutral">{visit.check_in_status.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-4 px-4">
        Show this QR at reception. No personal data is stored in the code.
      </p>
    </Card>
  );
}
