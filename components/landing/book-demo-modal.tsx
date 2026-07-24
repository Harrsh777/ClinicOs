"use client";

import { useEffect, useRef, useState } from "react";
import { submitDemoRequestAction } from "@/lib/actions/demo-requests";
import {
  DEMO_TIME_SLOTS,
  getMaxDemoDate,
  getMinDemoDate,
} from "@/lib/validations/demo-request";

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
    let cancelled = false;
    if (!open) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setError(null);
        setFieldErrors({});
        setSuccess(false);
        setLoading(false);
      });
    }
    return () => {
      cancelled = true;
    };
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
      <p className="demo-field-error">{fieldErrors[name]}</p>
    ) : null;
  }

  return (
    <dialog ref={dialogRef} onClose={onClose} className="demo-modal">
      <div className="demo-modal-header">
        <div className="demo-modal-header-copy">
          <p className="demo-eyebrow">Book a demo</p>
          <h2 className="demo-title serif">See ClinicOS in action</h2>
          <p className="demo-subtitle">
            Choose a slot and share a few clinic details — we&apos;ll confirm by email within one business day.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="demo-close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {success ? (
        <div className="demo-success">
          <div className="demo-success-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="serif">Demo request received</h3>
          <p>
            Thanks for your interest in ClinicOS. We&apos;ll email you shortly to confirm your demo slot.
          </p>
          <button type="button" onClick={onClose} className="demo-btn-primary">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="demo-form">
          {error && <div className="demo-alert">{error}</div>}

          <section className="demo-section">
            <div className="demo-section-label">
              <span className="demo-step">1</span>
              <span>Preferred schedule</span>
            </div>
            <div className="demo-grid demo-grid-2">
              <div className="demo-field">
                <label htmlFor="preferredDate">Preferred date *</label>
                <input
                  id="preferredDate"
                  type="date"
                  name="preferredDate"
                  required
                  min={getMinDemoDate()}
                  max={getMaxDemoDate()}
                />
                {fieldError("preferredDate")}
              </div>
              <div className="demo-field">
                <label htmlFor="preferredTime">Preferred time *</label>
                <select id="preferredTime" name="preferredTime" required defaultValue="">
                  <option value="" disabled>
                    Select a slot
                  </option>
                  {DEMO_TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot} IST
                    </option>
                  ))}
                </select>
                {fieldError("preferredTime")}
              </div>
            </div>
          </section>

          <section className="demo-section">
            <div className="demo-section-label">
              <span className="demo-step">2</span>
              <span>Clinic details</span>
            </div>
            <div className="demo-grid demo-grid-2">
              <div className="demo-field">
                <label htmlFor="clinicName">Clinic name *</label>
                <input id="clinicName" name="clinicName" required placeholder="City Health Clinic" />
                {fieldError("clinicName")}
              </div>
              <div className="demo-field">
                <label htmlFor="clinicType">Clinic type</label>
                <select id="clinicType" name="clinicType" defaultValue="">
                  <option value="">Select type</option>
                  {CLINIC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="demo-field">
                <label htmlFor="doctorName">Lead doctor name *</label>
                <input id="doctorName" name="doctorName" required placeholder="Dr. Amit Verma" />
                {fieldError("doctorName")}
              </div>
              <div className="demo-field">
                <label htmlFor="contactName">Contact person *</label>
                <input id="contactName" name="contactName" required placeholder="Clinic owner / manager" />
                {fieldError("contactName")}
              </div>
            </div>
          </section>

          <section className="demo-section">
            <div className="demo-section-label">
              <span className="demo-step">3</span>
              <span>Contact &amp; location</span>
            </div>
            <div className="demo-grid demo-grid-2">
              <div className="demo-field">
                <label htmlFor="email">Email *</label>
                <input id="email" name="email" type="email" required placeholder="owner@clinic.com" />
                {fieldError("email")}
              </div>
              <div className="demo-field">
                <label htmlFor="phone">Mobile *</label>
                <input id="phone" name="phone" type="tel" required placeholder="10-digit mobile" />
                {fieldError("phone")}
              </div>
            </div>
            <div className="demo-field">
              <label htmlFor="address">Clinic address</label>
              <input id="address" name="address" placeholder="Street, area, landmark" />
            </div>
            <div className="demo-grid demo-grid-3">
              <div className="demo-field">
                <label htmlFor="city">City *</label>
                <input id="city" name="city" required placeholder="Mumbai" />
                {fieldError("city")}
              </div>
              <div className="demo-field">
                <label htmlFor="state">State *</label>
                <select id="state" name="state" required defaultValue="">
                  <option value="" disabled>
                    Select state
                  </option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {fieldError("state")}
              </div>
              <div className="demo-field">
                <label htmlFor="pincode">Pincode</label>
                <input id="pincode" name="pincode" placeholder="400001" maxLength={6} />
                {fieldError("pincode")}
              </div>
            </div>
            <div className="demo-field">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Clinic size, current software, or anything we should prepare for the demo..."
              />
            </div>
          </section>

          <div className="demo-actions">
            <button type="button" onClick={onClose} disabled={loading} className="demo-btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="demo-btn-primary">
              {loading ? "Submitting…" : "Request demo"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
