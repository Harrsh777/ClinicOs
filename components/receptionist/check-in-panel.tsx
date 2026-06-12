"use client";

import { useState, useTransition } from "react";
import {
  lookupVisitByPhone,
  lookupVisitByBookingId,
  checkInVisitAction,
  markVisitPaidAction,
  createVisitAction,
} from "@/lib/actions/visits";
import { parseQRPayload } from "@/lib/visits/qr";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { QrCode, Phone, Hash, ScanLine, UserPlus, Siren } from "lucide-react";

interface CheckInPanelProps {
  clinicId: string;
}

type LookupResult = {
  patient: { id: string; full_name: string; phone: string; patient_code?: string | null };
  visit?: {
    id: string;
    visit_code: string;
    booking_id: string;
    token_label: string | null;
    payment_status: string;
    check_in_status: string;
    visit_type: string;
    qr_signature: string;
  };
};

export function CheckInPanel({ clinicId }: CheckInPanelProps) {
  const [mode, setMode] = useState<"qr" | "phone" | "booking">("qr");
  const [qrInput, setQrInput] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [walkInPatientId, setWalkInPatientId] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function clearState() {
    setResult(null);
    setCanCheckIn(false);
    setMessage(null);
  }

  async function handleQRScan() {
    clearState();
    const payload = parseQRPayload(qrInput);
    if (!payload) {
      setMessage({ type: "error", text: "Invalid QR format. Expected JSON with visitId and signature." });
      return;
    }

    startTransition(async () => {
      const res = await fetch(
        `/api/visits/${encodeURIComponent(payload.visitId)}?sig=${encodeURIComponent(payload.signature)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Lookup failed" });
        return;
      }
      setResult({
        patient: data.patient,
        visit: {
          id: "",
          visit_code: data.visit.visitId,
          booking_id: data.visit.bookingId,
          token_label: data.visit.tokenLabel,
          payment_status: data.visit.paymentStatus,
          check_in_status: data.visit.checkInStatus,
          visit_type: data.visit.visitType,
          qr_signature: payload.signature,
        },
      });
      setCanCheckIn(data.canCheckIn);
      if (!data.canCheckIn) {
        setMessage({ type: "error", text: data.blockReason ?? "Cannot check in" });
      }
    });
  }

  function handlePhoneSearch() {
    clearState();
    startTransition(async () => {
      const res = await lookupVisitByPhone(phone, clinicId);
      if ("error" in res) {
        setMessage({ type: "error", text: res.error ?? "Lookup failed" });
        return;
      }
      const lookup = res as LookupResult;
      setResult(lookup);
      setCanCheckIn(
        !!lookup.visit &&
        lookup.visit.check_in_status === "scheduled" &&
        lookup.visit.payment_status !== "pending"
      );
    });
  }

  function handleBookingSearch() {
    clearState();
    startTransition(async () => {
      const res = await lookupVisitByBookingId(bookingId, clinicId);
      if ("error" in res) {
        setMessage({ type: "error", text: res.error ?? "Request failed" });
        return;
      }
      setResult({ patient: res.patient, visit: res.visit });
      setCanCheckIn(
        res.visit.check_in_status === "scheduled" && res.visit.payment_status !== "pending"
      );
    });
  }

  function handleCheckIn() {
    if (!result?.visit) return;
    startTransition(async () => {
      const res = await checkInVisitAction(result.visit!.visit_code, result.visit!.qr_signature);
      if (res?.error) {
        setMessage({ type: "error", text: res.error ?? "Request failed" });
      } else {
        setMessage({
          type: "success",
          text: `Checked in! Token ${res.tokenLabel ?? ""} · Booking ${res.bookingId}`,
        });
        setResult(null);
      }
    });
  }

  function handleMarkPaid() {
    if (!result?.visit?.id) return;
    startTransition(async () => {
      await markVisitPaidAction(result.visit!.id);
      setMessage({ type: "success", text: "Payment marked as received" });
      if (result.visit) {
        setResult({ ...result, visit: { ...result.visit, payment_status: "paid" } });
      }
    });
  }

  function handleWalkIn(emergency: boolean) {
    if (!walkInPatientId) return;
    startTransition(async () => {
      const res = await createVisitAction(clinicId, walkInPatientId, {
        visitType: emergency ? "emergency" : "walk_in",
        paymentStatus: "pending",
        tokenSeries: emergency ? "emergency" : "regular",
        autoQueue: true,
      });
      if (res?.error) {
        setMessage({ type: "error", text: res.error ?? "Request failed" });
      } else {
        const visit = res.visit as { token_label: string; booking_id: string };
        setMessage({
          type: "success",
          text: `Token ${visit.token_label} created · ${emergency ? "EMERGENCY" : "Walk-in"} · PENDING PAYMENT`,
        });
      }
    });
  }

  const tabs = [
    { key: "qr" as const, label: "Scan QR", icon: QrCode },
    { key: "phone" as const, label: "Mobile Number", icon: Phone },
    { key: "booking" as const, label: "Booking ID", icon: Hash },
  ];

  return (
    <Card className="mb-8">
      <h3 className="font-semibold text-lg mb-1">Patient Check-In</h3>
      <p className="text-sm text-[var(--text-muted)] mb-5">Scan QR, search by mobile, or look up booking ID</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setMode(tab.key); clearState(); }}
            className={`clinic-btn clinic-btn-sm gap-2 ${mode === tab.key ? "clinic-btn-primary" : "clinic-btn-secondary"}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "qr" && (
        <div className="space-y-3">
          <Textarea
            label="Paste QR scan result"
            placeholder='{"visitId":"VIS-92813","signature":"abc123..."}'
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            className="font-mono text-sm min-h-[80px]"
          />
          <Button onClick={() => void handleQRScan()} loading={pending} className="gap-2">
            <ScanLine className="h-4 w-4" />
            Verify & Look Up
          </Button>
        </div>
      )}

      {mode === "phone" && (
        <div className="flex gap-3 items-end max-w-md">
          <Input
            label="Mobile Number"
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => void handlePhoneSearch()} loading={pending}>Search</Button>
        </div>
      )}

      {mode === "booking" && (
        <div className="flex gap-3 items-end max-w-md">
          <Input
            label="Booking ID"
            placeholder="BK-260612-0042"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="flex-1 font-mono"
          />
          <Button onClick={() => void handleBookingSearch()} loading={pending}>Search</Button>
        </div>
      )}

      {message && (
        <Alert variant={message.type === "success" ? "success" : "error"} className="mt-4">
          {message.text}
        </Alert>
      )}

      {result && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-lg">{result.patient.full_name}</p>
              <p className="text-sm text-[var(--text-muted)]">{result.patient.phone}</p>
              {result.visit && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="brand">Booking: {result.visit.booking_id}</Badge>
                  {result.visit.token_label && <Badge variant="info">Token: {result.visit.token_label}</Badge>}
                  <StatusBadge status={result.visit.payment_status} />
                  <StatusBadge status={result.visit.check_in_status} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {result.visit?.payment_status === "pending" && result.visit.id && (
                <Button size="sm" variant="secondary" onClick={() => void handleMarkPaid()} loading={pending}>
                  Mark Paid
                </Button>
              )}
              {result.visit && canCheckIn && (
                <Button size="sm" onClick={() => void handleCheckIn()} loading={pending}>
                  Check In
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-[var(--border)]">
        <p className="text-sm font-medium mb-3">Walk-In / Emergency</p>
        <div className="flex flex-wrap gap-3 items-end">
          <Input
            label="Patient ID"
            placeholder="Patient UUID from search"
            value={walkInPatientId}
            onChange={(e) => setWalkInPatientId(e.target.value)}
            className="max-w-xs"
          />
          <Button variant="secondary" onClick={() => void handleWalkIn(false)} loading={pending} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Walk-In Token
          </Button>
          <Button variant="danger" onClick={() => void handleWalkIn(true)} loading={pending} className="gap-2">
            <Siren className="h-4 w-4" />
            Emergency E-Token
          </Button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2">Walk-ins are created with PENDING PAYMENT status</p>
      </div>
    </Card>
  );
}
