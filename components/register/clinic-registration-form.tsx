"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { submitClinicRegistrationAction } from "@/lib/actions/clinic-registration";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const CLINIC_TYPES = [
  "Multi-Specialty Hospital",
  "Single Specialty Clinic",
  "Diagnostic Center",
  "Dental Clinic",
  "Ayurveda / Homeopathy",
  "Other",
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export function ClinicRegistrationForm() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const result = await submitClinicRegistrationAction(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      if ("fieldErrors" in result && result.fieldErrors) setFieldErrors(result.fieldErrors);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg py-4 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <Alert variant="success">
          <p className="font-semibold">Registration submitted — Status: Pending Approval</p>
          <p className="mt-1 text-sm">
            Our admin team will review your clinic registration. You will receive an email with your
            Clinic ID and login credentials once approved. Login is not available until approval.
          </p>
        </Alert>
        <Link
          href="/"
          className="mt-6 inline-flex text-sm font-medium text-[var(--secondary)] hover:underline"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Clinic name"
            name="clinicName"
            required
            placeholder="City Health Clinic"
            error={fieldErrors.clinicName}
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Clinic owner name"
            name="ownerName"
            required
            placeholder="Dr. Anita Mehta"
            error={fieldErrors.ownerName}
          />
        </div>
        <Input
          label="Email"
          name="email"
          type="email"
          required
          placeholder="owner@yourclinic.com"
          error={fieldErrors.email}
        />
        <Input
          label="Phone number"
          name="phone"
          required
          placeholder="9876543210"
          error={fieldErrors.phone}
        />
        <Input
          label="City"
          name="city"
          required
          placeholder="Mumbai"
          error={fieldErrors.city}
        />
        <Select
          label="State"
          name="state"
          required
          defaultValue={INDIAN_STATES[0]}
          error={fieldErrors.state}
          options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
        />
        <Select
          label="Clinic type"
          name="clinicType"
          required
          defaultValue={CLINIC_TYPES[0]}
          error={fieldErrors.clinicType}
          options={CLINIC_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <Input
          label="Number of doctors (optional)"
          name="doctorCount"
          type="number"
          min={1}
          max={500}
          placeholder="e.g. 3"
          error={fieldErrors.doctorCount}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-sm text-[var(--text-muted)] sm:text-left">
          Already have credentials?{" "}
          <Link href="/login" className="font-medium text-[var(--secondary)] hover:underline">
            Sign in
          </Link>
        </p>
        <Button type="submit" loading={loading} size="lg" className="w-full sm:w-auto">
          Submit registration
        </Button>
      </div>
    </form>
  );
}
