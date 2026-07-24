"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { walkInQuickAction } from "@/lib/actions/appointments";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  feeWithTax,
  resolveWalkInFee,
  type ClinicFeeSetup,
  type WalkInFeeType,
} from "@/lib/billing/clinic-fees";
import { Activity, Banknote, CreditCard, IndianRupee, QrCode, Siren, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Doctor {
  id: string;
  profiles?: { full_name: string; specialization: string | null };
}

type PaymentMethod = "cash" | "card" | "upi";

export function WalkInQuickForm({
  doctors,
  feeSetup,
}: {
  doctors: Doctor[];
  feeSetup: ClinicFeeSetup;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [feeType, setFeeType] = useState<WalkInFeeType>("normal");
  const [customFee, setCustomFee] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [message, setMessage] = useState<{
    text: string;
    ok: boolean;
    tokenLabel?: string | null;
    invoiceNumber?: string | null;
  } | null>(null);

  const visitType = isEmergency ? "emergency" : "walk_in";

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      if (isEmergency && feeType === "normal") {
        setFeeType("emergency");
      }
      if (!isEmergency && feeType === "emergency") {
        setFeeType("normal");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isEmergency, feeType]);

  const baseFee = useMemo(() => {
    if (!doctorId) return 0;
    const custom = customFee ? Number(customFee) : undefined;
    return resolveWalkInFee(feeSetup, doctorId, feeType, visitType, custom);
  }, [feeSetup, doctorId, feeType, visitType, customFee]);

  const totalWithTax = feeWithTax(baseFee, feeSetup.taxRate);

  const enabledMethods = useMemo(() => {
    const methods: { key: PaymentMethod; label: string; icon: typeof Banknote }[] = [];
    if (feeSetup.paymentMethods.cash) methods.push({ key: "cash", label: "Cash", icon: Banknote });
    if (feeSetup.paymentMethods.card) methods.push({ key: "card", label: "Card", icon: CreditCard });
    if (feeSetup.paymentMethods.upi) methods.push({ key: "upi", label: "UPI", icon: QrCode });
    return methods;
  }, [feeSetup.paymentMethods]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      if (enabledMethods.length === 1) {
        setPaymentMethod(enabledMethods[0].key);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabledMethods]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paymentMethod) {
      setMessage({ text: "Select a payment method", ok: false });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("type", visitType);
    formData.set("feeType", feeType);
    formData.set("paymentMethod", paymentMethod);
    if (feeType === "custom" && customFee) {
      formData.set("customFee", customFee);
    }

    const result = await walkInQuickAction(formData);

    if (result?.error) {
      setMessage({ text: result.error, ok: false });
    } else {
      const parts = [
        result.isExistingPatient ? "Existing patient" : `New patient ${result.patientCode}`,
        result.tokenLabel ? `Token ${result.tokenLabel}` : null,
        result.invoiceNumber ? `Invoice ${result.invoiceNumber}` : null,
        result.totalAmount ? `₹${Number(result.totalAmount).toFixed(2)} via ${result.paymentMethod}` : null,
      ].filter(Boolean);

      setMessage({
        text: `Walk-in registered — ${parts.join(" · ")}`,
        ok: true,
        tokenLabel: result.tokenLabel,
        invoiceNumber: result.invoiceNumber,
      });
      (e.target as HTMLFormElement).reset();
      setIsEmergency(false);
      setDoctorId("");
      setFeeType("normal");
      setCustomFee("");
      setPaymentMethod(enabledMethods.length === 1 ? enabledMethods[0].key : "");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <Alert variant={message.ok ? "success" : "error"}>
          <div className="flex flex-wrap items-center gap-2">
            <span>{message.text}</span>
            {message.ok && message.tokenLabel && <Badge variant="brand">{message.tokenLabel}</Badge>}
            {message.ok && message.invoiceNumber && (
              <Badge variant="success">{message.invoiceNumber}</Badge>
            )}
          </div>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Patient name"
          name="fullName"
          required
          placeholder="Raj Kumar"
          autoFocus
        />
        <Input
          label="Mobile number"
          name="phone"
          required
          type="tel"
          placeholder="9876543210"
          inputMode="numeric"
          pattern="[6-9][0-9]{9}"
          title="10-digit Indian mobile number"
        />
        <Input
          label="Age"
          name="age"
          type="number"
          min={0}
          max={150}
          placeholder="35"
        />
        <Select
          label="Gender"
          name="gender"
          options={[
            { value: "", label: "Not specified" },
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ]}
        />
        <Select
          label="Doctor"
          name="doctorId"
          required
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          options={[
            { value: "", label: "Select doctor..." },
            ...doctors.map((d) => ({
              value: d.id,
              label: `${d.profiles?.full_name ?? "Doctor"}${d.profiles?.specialization ? ` — ${d.profiles.specialization}` : ""}`,
            })),
          ]}
        />
      </div>

      <Textarea
        label="Problem / chief complaint"
        name="chiefComplaint"
        required
        placeholder="Fever and headache since 2 days..."
        className="min-h-[72px]"
      />

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-[var(--brand-500)]" />
          <p className="text-sm font-medium">Vitals (optional)</p>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Input label="Temp °C" name="temperatureC" type="number" step="0.1" placeholder="37.2" className="text-sm" />
          <Input label="Weight kg" name="weightKg" type="number" step="0.1" placeholder="68" className="text-sm" />
          <Input label="BP sys" name="bpSystolic" type="number" placeholder="120" className="text-sm" />
          <Input label="BP dia" name="bpDiastolic" type="number" placeholder="80" className="text-sm" />
          <Input label="Pulse" name="pulse" type="number" placeholder="72" className="text-sm" />
          <Input label="SpO₂ %" name="spo2" type="number" placeholder="98" className="text-sm" />
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/50 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-[var(--brand-500)]" />
          <p className="text-sm font-semibold">Payment</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "normal" as const, label: "Normal", amount: doctorId ? resolveWalkInFee(feeSetup, doctorId, "normal", visitType) : feeSetup.normalFee },
              { key: "emergency" as const, label: "Emergency", amount: feeSetup.emergencyFee },
              { key: "custom" as const, label: "Custom", amount: null },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFeeType(option.key)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors min-w-[120px]",
                feeType === option.key
                  ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                  : "border-[var(--border)] hover:bg-[var(--surface-1)]"
              )}
            >
              <span className="font-medium block">{option.label}</span>
              {option.amount != null && (
                <span className="text-xs text-[var(--text-muted)]">₹{option.amount}</span>
              )}
            </button>
          ))}
        </div>

        {feeType === "custom" && (
          <Input
            label="Custom amount (₹)"
            name="customFeeDisplay"
            type="number"
            min={0}
            step="1"
            value={customFee}
            onChange={(e) => setCustomFee(e.target.value)}
            placeholder="Enter amount"
            required
          />
        )}

        <div className="flex flex-wrap items-end justify-between gap-3 pt-2 border-t border-[var(--border)]">
          <div className="text-sm">
            <p className="text-[var(--text-muted)]">Total payable</p>
            <p className="text-xl font-bold text-[var(--brand-600)]">
              ₹{totalWithTax.toFixed(2)}
              {feeSetup.taxRate > 0 && (
                <span className="text-xs font-normal text-[var(--text-muted)] ml-2">
                  (incl. {feeSetup.taxRate}% tax)
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {enabledMethods.map((method) => (
              <button
                key={method.key}
                type="button"
                onClick={() => setPaymentMethod(method.key)}
                className={cn(
                  "clinic-btn clinic-btn-sm gap-2",
                  paymentMethod === method.key ? "clinic-btn-primary" : "clinic-btn-secondary"
                )}
              >
                <method.icon className="h-4 w-4" />
                {method.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={() => setIsEmergency(false)}
          className={cn(
            "clinic-btn clinic-btn-sm gap-2",
            !isEmergency ? "clinic-btn-primary" : "clinic-btn-secondary"
          )}
        >
          <UserPlus className="h-4 w-4" />
          Walk-in
        </button>
        <button
          type="button"
          onClick={() => setIsEmergency(true)}
          className={cn(
            "clinic-btn clinic-btn-sm gap-2",
            isEmergency ? "clinic-btn-danger" : "clinic-btn-secondary"
          )}
        >
          <Siren className="h-4 w-4" />
          Emergency
        </button>
        <div className="flex-1" />
        <Button
          type="submit"
          loading={loading}
          disabled={!doctorId || !paymentMethod || (feeType === "custom" && !customFee)}
          className="gap-2 min-w-[220px]"
        >
          <UserPlus className="h-4 w-4" />
          {isEmergency ? "Register, Pay & E-Token" : "Register, Pay & Queue"}
        </Button>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Patient, vitals, queue token, invoice, and payment are recorded together. Visible in Billing, Finance, and Dashboard.
      </p>
    </form>
  );
}
