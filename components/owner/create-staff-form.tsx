"use client";

import { useState } from "react";
import { createStaffAccountAction } from "@/lib/actions/owner";
import { ASSIGNABLE_MODULES, ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function CreateStaffForm({
  clinicCode,
  departments = [],
}: {
  clinicCode: string;
  departments?: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    clinicCode: string;
    staffCode: string;
    email: string;
    role: string;
    activationUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(["patients", "appointments"]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreated(null);
    const formData = new FormData(e.currentTarget);
    selectedModules.forEach((m) => formData.append("moduleKeys", m));
    formData.set("sendEmail", "on");
    const result = await createStaffAccountAction(formData);
    if (result?.error) setError(result.error);
    else if (result?.staff) {
      setCreated(result.staff as typeof created);
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  return (
    <div className="clinic-card p-5">
      <h3 className="font-semibold mb-1">Create staff account</h3>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Sends an activation link by email. Staff sign in with Clinic ID <strong>{clinicCode}</strong> and their Staff ID.
      </p>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {created && (
        <Alert variant="success" className="mb-4">
          <p className="font-medium">Account created — activation email sent</p>
          <div className="mt-2 text-xs font-mono space-y-1">
            <p>Clinic ID: {created.clinicCode}</p>
            <p>Staff ID: {created.staffCode}</p>
            <p>Email: {created.email}</p>
            <p>Role: {created.role}</p>
            {created.activationUrl && <p className="break-all">Activation: {created.activationUrl}</p>}
          </div>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" name="fullName" required placeholder="Dr. Amit Verma" />
        <Input label="Email" name="email" type="email" required placeholder="doctor@clinic.com" />
        <Input label="Phone" name="phone" placeholder="9876543210" />
        <Select
          label="Role"
          name="role"
          required
          options={ASSIGNABLE_ROLES.map((r) => ({
            value: r,
            label: r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          }))}
        />
        {departments.length > 0 && (
          <Select
            label="Department"
            name="departmentId"
            options={[
              { value: "", label: "— None —" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        )}
        <div className="sm:col-span-2">
          <p className="clinic-label">Module access</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {ASSIGNABLE_MODULES.map((mod) => (
              <label key={mod} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedModules.includes(mod)}
                  onChange={(e) =>
                    setSelectedModules((prev) =>
                      e.target.checked ? [...prev, mod] : prev.filter((m) => m !== mod)
                    )
                  }
                  className="rounded border-[var(--border)]"
                />
                <span className="capitalize">{mod}</span>
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" loading={loading} className="sm:col-span-2">
          Create account &amp; send activation email
        </Button>
      </form>
    </div>
  );
}
