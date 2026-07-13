"use client";

import { useState } from "react";
import Link from "next/link";
import {
  sharePrescriptionEmailAction,
  sharePrescriptionWhatsAppAction,
} from "@/lib/actions/prescriptions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { MessageCircle, Mail, Printer, ExternalLink } from "lucide-react";

export function PrescriptionSharePanel({
  prescriptionId,
  patientName,
  patientPhone,
  patientEmail,
  sharedAt,
}: {
  prescriptionId: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string | null;
  sharedAt?: string | null;
}) {
  const [waLoading, setWaLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleWhatsApp() {
    setWaLoading(true);
    setMessage(null);
    const result = await sharePrescriptionWhatsAppAction(prescriptionId);
    setWaLoading(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({
      type: "success",
      text: result.simulated
        ? `WhatsApp simulated in dev — ${patientName} would receive the prescription on ${patientPhone ?? "their phone"}.`
        : `Prescription sent to ${patientName} on WhatsApp.`,
    });
  }

  async function handleEmail() {
    setEmailLoading(true);
    setMessage(null);
    const result = await sharePrescriptionEmailAction(prescriptionId);
    setEmailLoading(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({
      type: "success",
      text: `Prescription emailed to ${patientEmail}.`,
    });
  }

  return (
    <Card>
      <h3 className="font-semibold mb-1">Share with patient</h3>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Send the prescription via WhatsApp or email. Patients can also view it in their portal.
      </p>

      {sharedAt && (
        <p className="text-xs text-emerald-600 mb-3">
          Last shared {new Date(sharedAt).toLocaleString()}
        </p>
      )}

      {message && (
        <Alert variant={message.type === "success" ? "success" : "error"} className="mb-4">
          {message.text}
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => void handleWhatsApp()}
          loading={waLoading}
          disabled={!patientPhone}
          className="gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Send on WhatsApp
        </Button>
        <Button
          variant="secondary"
          onClick={() => void handleEmail()}
          loading={emailLoading}
          disabled={!patientEmail}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          Send email
        </Button>
        <Link href={`/print/prescription/${prescriptionId}`} target="_blank">
          <Button variant="ghost" className="gap-2">
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
        </Link>
        <Link href="/patient/prescriptions" target="_blank">
          <Button variant="ghost" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Patient portal
          </Button>
        </Link>
      </div>

      {!patientPhone && (
        <p className="text-xs text-[var(--text-muted)] mt-3">No phone number on file for WhatsApp.</p>
      )}
      {!patientEmail && (
        <p className="text-xs text-[var(--text-muted)]">No email on file.</p>
      )}
    </Card>
  );
}
