"use client";

import { PatientPicker } from "@/components/patients/patient-picker";
import { Input, Select } from "@/components/ui/input";
import { UserPlus, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export type PatientMode = "existing" | "new";

export interface PatientResult {
  id: string;
  full_name: string;
  phone: string;
  patient_code: string | null;
}

export function PatientSelector({
  clinicId,
  mode,
  onModeChange,
  selectedPatient,
  onPatientChange,
}: {
  clinicId: string;
  mode: PatientMode;
  onModeChange: (mode: PatientMode) => void;
  selectedPatient: PatientResult | null;
  onPatientChange: (patient: PatientResult | null) => void;
}) {
  function switchMode(next: PatientMode) {
    onModeChange(next);
    if (next === "new") onPatientChange(null);
  }

  return (
    <div className="space-y-3">
      <p className="clinic-label">Patient</p>
      <div className="flex rounded-[var(--radius-md)] border border-[var(--border)] p-1 gap-1">
        <button
          type="button"
          onClick={() => switchMode("existing")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
            mode === "existing"
              ? "bg-[var(--surface-2)] text-[var(--brand-600)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          <UserSearch className="h-4 w-4 shrink-0" />
          Existing patient
        </button>
        <button
          type="button"
          onClick={() => switchMode("new")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
            mode === "new"
              ? "bg-[var(--surface-2)] text-[var(--brand-600)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          <UserPlus className="h-4 w-4 shrink-0" />
          New patient
        </button>
      </div>

      {mode === "existing" ? (
        <PatientPicker
          clinicId={clinicId}
          value={selectedPatient}
          onChange={onPatientChange}
          label=""
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" name="fullName" required placeholder="Raj Kumar" autoFocus />
          <Input
            label="Mobile number"
            name="phone"
            required
            type="tel"
            placeholder="9876543210"
            inputMode="numeric"
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
        </div>
      )}

      <input type="hidden" name="patientMode" value={mode} />
    </div>
  );
}
