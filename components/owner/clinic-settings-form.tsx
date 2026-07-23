"use client";

import { useState } from "react";
import { updateDoctorClinicSettingsAction } from "@/lib/actions/doctor-settings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { readEmergencyFeeFromSettings } from "@/lib/billing/clinic-fees";
import type { Clinic, ClinicThemePreset } from "@/lib/types/database";

const THEME_PRESETS: { key: ClinicThemePreset; label: string; icon: string; bg: string; border: string; desc: string }[] = [
  {
    key: "clinical_teal",
    label: "Modern Clinical Teal",
    icon: "🩺",
    bg: "bg-teal-50 text-teal-900",
    border: "border-teal-300",
    desc: "Clean & professional medical theme for general practice",
  },
  {
    key: "kids_pediatric",
    label: "Pediatrics & Child Care",
    icon: "🧸",
    bg: "bg-sky-50 text-sky-900",
    border: "border-sky-300",
    desc: "Playful pastel sky-blue & sunny colors for child specialists",
  },
  {
    key: "dental_care",
    label: "Dental & Orthodontics",
    icon: "🦷",
    bg: "bg-cyan-50 text-cyan-900",
    border: "border-cyan-300",
    desc: "Fresh cyan & tooth-white design for dental practices",
  },
  {
    key: "dermatology_rose",
    label: "Dermatology & Skin",
    icon: "🌸",
    bg: "bg-rose-50 text-rose-900",
    border: "border-rose-300",
    desc: "Soft rose & coral palette for skin, aesthetics & maternity",
  },
  {
    key: "emergency_slate",
    label: "Emergency & Urgent Care",
    icon: "⚡",
    bg: "bg-amber-50 text-amber-900",
    border: "border-amber-300",
    desc: "High-contrast slate & amber for trauma & urgent care",
  },
  {
    key: "holistic_sage",
    label: "Wellness & Holistic",
    icon: "🌿",
    bg: "bg-emerald-50 text-emerald-900",
    border: "border-emerald-300",
    desc: "Calming sage green & natural warmth for homeopathy & Ayurveda",
  },
];

export function ClinicSettingsForm({ clinic }: { clinic: Clinic }) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const branding = clinic.branding;
  const [selectedTheme, setSelectedTheme] = useState<ClinicThemePreset>(
    branding?.theme_preset ?? "clinical_teal"
  );
  const [onlineBookingEnabled, setOnlineBookingEnabled] = useState<boolean>(
    clinic.portal_enabled ?? true
  );
  const [teleconsultEnabled, setTeleconsultEnabled] = useState<boolean>(
    branding?.teleconsult_enabled ?? true
  );
  const [emergencyEnabled, setEmergencyEnabled] = useState<boolean>(
    branding?.emergency_enabled ?? clinic.emergency_available ?? true
  );

  const emergencyDefault = readEmergencyFeeFromSettings(
    clinic.settings as Record<string, unknown> | undefined,
    Number(clinic.consultation_fee_default ?? 500)
  );

  const [teleconsultDays, setTeleconsultDays] = useState<string[]>([
    "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
  ]);
  const [teleconsultStartTime, setTeleconsultStartTime] = useState<string>("09:00");
  const [teleconsultEndTime, setTeleconsultEndTime] = useState<string>("18:00");

  function toggleTeleconsultDay(day: string) {
    setTeleconsultDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);
    fd.set("themePreset", selectedTheme);
    fd.set("onlineBookingEnabled", String(onlineBookingEnabled));
    fd.set("teleconsultEnabled", String(teleconsultEnabled));
    fd.set("emergencyEnabled", String(emergencyEnabled));
    fd.set("teleconsultDays", teleconsultDays.join(","));
    fd.set("teleconsultStartTime", teleconsultStartTime);
    fd.set("teleconsultEndTime", teleconsultEndTime);

    const result = await updateDoctorClinicSettingsAction(fd);
    setMessage(
      result?.error
        ? { type: "error", text: result.error }
        : { type: "success", text: "Clinic settings, teleconsult schedule & fees saved!" }
    );
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {message && <Alert variant={message.type === "success" ? "success" : "error"}>{message.text}</Alert>}

      {/* Section 1: General Details & Fees */}
      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-[var(--text-primary)]">General Clinic Details & Fees</h3>
        
        <Input label="Clinic Name" name="name" defaultValue={clinic.name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Phone" name="phone" defaultValue={clinic.phone ?? ""} />
          <Input label="Address" name="address" defaultValue={clinic.address ?? ""} />
        </div>

        <Input
          label="Normal consultation fee (₹)"
          name="consultationFee"
          type="number"
          min={0}
          defaultValue={clinic.consultation_fee_default}
        />
      </div>

      {/* Section 2: Consultation Service Toggles & Fees */}
      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Consultation Modes & Fees</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Turn on online appointment booking and consultation modes to set their fees and activate them for patient booking.
        </p>

        {/* Master Online Booking Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/60 p-4">
          <div>
            <p className="font-bold text-sm text-teal-900">Online Appointment Booking Status</p>
            <p className="text-xs text-teal-700">
              {onlineBookingEnabled
                ? "ACTIVE — Patients can book appointments online at your public link"
                : "DISABLED — Public link displays 'Booking unavailable'"}
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              name="onlineBookingEnabledToggle"
              checked={onlineBookingEnabled}
              onChange={(e) => setOnlineBookingEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Teleconsult Toggle & Fee */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Video Teleconsultation</p>
                <p className="text-xs text-[var(--text-muted)]">Allow patients to book online video appointments</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  name="teleconsultEnabledToggle"
                  checked={teleconsultEnabled}
                  onChange={(e) => setTeleconsultEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>

            {teleconsultEnabled && (
              <div className="pt-3 border-t border-[var(--border)] space-y-3 animate-fadeIn">
                <Input
                  label="Video Teleconsultation Fee (₹)"
                  name="teleconsultFee"
                  type="number"
                  min={0}
                  defaultValue={600}
                  placeholder="600"
                />

                {/* Available Days of Week */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                    Available Days for Video Consults
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                      const isSelected = teleconsultDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleTeleconsultDay(day)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                            isSelected
                              ? "bg-teal-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Video Consult Time Window */}
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label="Start Time"
                    type="time"
                    name="teleconsultStartTimeInput"
                    value={teleconsultStartTime}
                    onChange={(e) => setTeleconsultStartTime(e.target.value)}
                  />
                  <Input
                    label="End Time"
                    type="time"
                    name="teleconsultEndTimeInput"
                    value={teleconsultEndTime}
                    onChange={(e) => setTeleconsultEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Emergency Toggle & Fee */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Emergency Consultations</p>
                <p className="text-xs text-[var(--text-muted)]">Enable high-priority urgent visit booking</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  name="emergencyEnabledToggle"
                  checked={emergencyEnabled}
                  onChange={(e) => setEmergencyEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>

            {emergencyEnabled && (
              <div className="pt-2 border-t border-[var(--border)] animate-fadeIn">
                <Input
                  label="Emergency Consultation Fee (₹)"
                  name="emergencyFee"
                  type="number"
                  min={0}
                  defaultValue={emergencyDefault}
                  placeholder="750"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Public Booking Page Branding & Specialty Theme Templates */}
      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Public Booking Page Theme & Branding</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Select a specialty color theme template and add photos/bio for your public booking page.
          </p>
        </div>

        {/* Theme Preset Selector */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Select Specialty Theme Preset
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEME_PRESETS.map((t) => {
              const isSelected = selectedTheme === t.key;
              return (
                <div
                  key={t.key}
                  onClick={() => setSelectedTheme(t.key)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${t.bg} ${isSelected ? `${t.border} ring-2 ring-teal-500 shadow-md` : "border-[var(--border)] hover:opacity-90"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{t.icon}</span>
                    {isSelected && (
                      <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-bold">{t.label}</p>
                  <p className="mt-1 text-[11px] opacity-80">{t.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Specialization / Department Badge"
            name="specializationBadge"
            defaultValue={branding?.specialization_badge ?? "Child Specialist & Pediatrics"}
            placeholder="e.g. Dental & Orthodontics / Child Specialist"
          />
          <Input
            label="Short Tagline"
            name="tagline"
            defaultValue={branding?.tagline ?? ""}
            placeholder="e.g. Caring for your family's health"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Header Cover Photo URL"
            name="coverImageUrl"
            defaultValue={branding?.cover_image_url ?? ""}
            placeholder="https://example.com/clinic-banner.jpg"
          />
          <Input
            label="Clinic Logo URL"
            name="logoUrl"
            defaultValue={branding?.logo_url ?? clinic.logo_url ?? ""}
            placeholder="https://example.com/clinic-logo.png"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Doctor / Clinic Bio & Overview</label>
          <textarea
            name="bioDescription"
            rows={3}
            defaultValue={branding?.bio_description ?? ""}
            placeholder="Provide a warm welcome message, doctor qualifications, and clinic highlights for patient booking..."
            className="clinic-input w-full text-xs"
          />
        </div>
      </div>

      <Button type="submit" loading={loading} className="w-full sm:w-auto px-8">
        Save All Settings & Theme Changes
      </Button>
    </form>
  );
}
