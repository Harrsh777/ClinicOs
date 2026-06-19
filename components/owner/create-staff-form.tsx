"use client";

import { useState } from "react";
import { createStaffAccountAction } from "@/lib/actions/owner";
import { ASSIGNABLE_MODULES, ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function CreateStaffForm({ clinicCode }: { clinicCode: string }) {
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    clinicCode: string;
    email: string;
    password: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(["patients", "appointments"]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCredentials(null);
    const formData = new FormData(e.currentTarget);
    selectedModules.forEach((m) => formData.append("moduleKeys", m));
    formData.set("sendEmail", "on");
    const result = await createStaffAccountAction(formData);
    if (result?.error) setError(result.error);
    else if (result?.credentials?.email && result.credentials.password) {
      setCredentials({
        clinicCode: result.credentials.clinicCode ?? clinicCode,
        email: result.credentials.email,
        password: result.credentials.password,
        role: result.credentials.role ?? "",
      });
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  return (
    <div className="clinic-card p-5">
      <h3 className="font-semibold mb-1">Create staff account</h3>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Creates login credentials and emails them. Staff sign in with Clinic ID <strong>{clinicCode}</strong>.
      </p>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {credentials && (
        <Alert variant="success" className="mb-4">
          <p className="font-medium">Account created{credentials ? " — credentials emailed" : ""}</p>
          <div className="mt-2 text-xs font-mono space-y-1">
            <p>Clinic ID: {credentials.clinicCode}</p>
            <p>Email: {credentials.email}</p>
            <p>Password: {credentials.password}</p>
            <p>Role: {credentials.role}</p>
          </div>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" name="fullName" required placeholder="Dr. Amit Verma" />
        <Input label="Email (login ID)" name="email" type="email" required placeholder="doctor@clinic.com" />
        <Select
          label="Role"
          name="role"
          required
          options={ASSIGNABLE_ROLES.map((r) => ({
            value: r,
            label: r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          }))}
        />
        <Input
          label="Password (optional)"
          name="password"
          type="text"
          placeholder="Auto-generated if left blank"
        />
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
          Create account &amp; send email
        </Button>
      </form>
    </div>
  );
}
