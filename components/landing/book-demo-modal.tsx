"use client";

import { useEffect, useRef, useState } from "react";
import { submitDemoRequestAction } from "@/lib/actions/demo-requests";
import {
  DEMO_TIME_SLOTS,
  getMaxDemoDate,
  getMinDemoDate,
} from "@/lib/validations/demo-request";

const COLORS = {
  primary: "#0F172A",
  accent: "#14B8A6",
  accent2: "#06B6D4",
  white: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#64748B",
};

const CLINIC_TYPES = [
  "Multi-Specialty Hospital",
  "Single Specialty Clinic",
  "Diagnostic Center",
  "Dental Clinic",
  "Ayurveda / Homeopathy",
  "Other",
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${COLORS.border}`,
  fontSize: 14,
  fontFamily: "Inter, sans-serif",
  color: COLORS.primary,
  background: COLORS.white,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: COLORS.muted,
  marginBottom: 6,
  fontFamily: "Inter, sans-serif",
};

interface BookDemoModalProps {
  open: boolean;
  onClose: () => void;
}

export function BookDemoModal({ open, onClose }: BookDemoModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setFieldErrors({});
      setSuccess(false);
      setLoading(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    formData.set("clientTimezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    formData.set("screenResolution", `${window.screen.width}x${window.screen.height}`);

    const result = await submitDemoRequestAction(formData);
    if (result?.error) {
      setError(result.error);
      if ("fieldErrors" in result && result.fieldErrors) setFieldErrors(result.fieldErrors);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  function fieldError(name: string) {
    return fieldErrors[name] ? (
      <p style={{ marginTop: 4, fontSize: 11, color: "#ef4444", fontFamily: "Inter, sans-serif" }}>{fieldErrors[name]}</p>
    ) : null;
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        margin: "auto",
        width: "min(640px, calc(100vw - 32px))",
        maxHeight: "min(90vh, 900px)",
        overflow: "auto",
        border: "none",
        borderRadius: 20,
        padding: 0,
        background: COLORS.white,
        boxShadow: "0 24px 80px rgba(15,23,42,0.25)",
      }}
    >
      <div style={{ padding: "28px 28px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
              Book a Demo
            </p>
            <h2 style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: COLORS.primary, fontFamily: "Geist, Inter, sans-serif", letterSpacing: "-0.03em" }}>
              Schedule your Clinicos walkthrough
            </h2>
            <p style={{ marginTop: 8, fontSize: 14, color: COLORS.muted, lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>
              Pick a date and time, share your clinic details, and our team will reach out to confirm.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: COLORS.border,
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              color: COLORS.muted,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {success ? (
        <div style={{ padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: COLORS.primary, fontFamily: "Inter, sans-serif" }}>Demo request received</h3>
          <p style={{ marginTop: 8, fontSize: 14, color: COLORS.muted, lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>
            Thanks for your interest in Clinicos. We&apos;ll email you shortly to confirm your demo slot.
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: 24,
              padding: "12px 24px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
              color: COLORS.white,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          {error && (
            <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Preferred date *</label>
              <input type="date" name="preferredDate" required min={getMinDemoDate()} max={getMaxDemoDate()} style={fieldStyle} />
              {fieldError("preferredDate")}
            </div>
            <div>
              <label style={labelStyle}>Preferred time *</label>
              <select name="preferredTime" required defaultValue="" style={fieldStyle}>
                <option value="" disabled>Select a slot</option>
                {DEMO_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot} IST</option>
                ))}
              </select>
              {fieldError("preferredTime")}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Clinic name *</label>
              <input name="clinicName" required placeholder="City Health Clinic" style={fieldStyle} />
              {fieldError("clinicName")}
            </div>
            <div>
              <label style={labelStyle}>Clinic type</label>
              <select name="clinicType" defaultValue="" style={fieldStyle}>
                <option value="">Select type</option>
                {CLINIC_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Lead doctor name *</label>
              <input name="doctorName" required placeholder="Dr. Amit Verma" style={fieldStyle} />
              {fieldError("doctorName")}
            </div>
            <div>
              <label style={labelStyle}>Contact person *</label>
              <input name="contactName" required placeholder="Clinic owner / manager" style={fieldStyle} />
              {fieldError("contactName")}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input name="email" type="email" required placeholder="owner@clinic.com" style={fieldStyle} />
              {fieldError("email")}
            </div>
            <div>
              <label style={labelStyle}>Mobile *</label>
              <input name="phone" type="tel" required placeholder="10-digit mobile" style={fieldStyle} />
              {fieldError("phone")}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Clinic address</label>
            <input name="address" placeholder="Street, area, landmark" style={fieldStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>City *</label>
              <input name="city" required placeholder="Mumbai" style={fieldStyle} />
              {fieldError("city")}
            </div>
            <div>
              <label style={labelStyle}>State *</label>
              <select name="state" required defaultValue="" style={fieldStyle}>
                <option value="" disabled>Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {fieldError("state")}
            </div>
            <div>
              <label style={labelStyle}>Pincode</label>
              <input name="pincode" placeholder="400001" maxLength={6} style={fieldStyle} />
              {fieldError("pincode")}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Tell us about your clinic size, current software, or specific needs..."
              style={{ ...fieldStyle, resize: "vertical", minHeight: 80 }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.white,
                color: COLORS.muted,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 24px",
                borderRadius: 12,
                border: "none",
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
                color: COLORS.white,
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {loading ? "Submitting..." : "Request Demo"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
