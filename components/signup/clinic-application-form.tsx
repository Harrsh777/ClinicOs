"use client";

import { useState } from "react";
import Link from "next/link";
import { submitClinicApplicationAction } from "@/lib/actions/signup";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface Plan {
  slug: string;
  name: string;
  price_monthly: number;
}

export function ClinicApplicationForm({ plans }: { plans: Plan[] }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await submitClinicApplicationAction(new FormData(e.currentTarget));
    if (result?.error) setError(result.error);
    else setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <Alert variant="success">
        <p className="font-semibold">Application submitted!</p>
        <p className="mt-1 text-sm">
          We&apos;ll review your clinic details and email your Clinic ID and login credentials once approved.
        </p>
        <Link href="/login" className="mt-3 inline-block text-sm font-medium text-[var(--brand-600)] hover:underline">
          Back to sign in
        </Link>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Clinic name" name="clinicName" required placeholder="City Health Clinic" />
        </div>
        <Input label="Owner full name" name="ownerName" required placeholder="Dr. Anita Mehta" />
        <Input label="Owner email" name="ownerEmail" type="email" required placeholder="owner@yourclinic.com" />
        <Input label="Phone" name="phone" required placeholder="9876543210" />
        <Select
          label="Plan"
          name="planSlug"
          options={plans.map((p) => ({
            value: p.slug,
            label: `${p.name} — ₹${Number(p.price_monthly).toLocaleString("en-IN")}/mo`,
          }))}
        />
        <div className="sm:col-span-2">
          <Input label="Address" name="address" required placeholder="Street address" />
        </div>
        <Input label="City" name="city" required placeholder="Mumbai" />
        <Input label="State" name="state" required placeholder="Maharashtra" />
        <Input label="PIN code" name="pincode" required placeholder="400001" maxLength={6} />
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Submit application
      </Button>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Already have credentials?{" "}
        <Link href="/login" className="font-medium text-[var(--brand-600)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
