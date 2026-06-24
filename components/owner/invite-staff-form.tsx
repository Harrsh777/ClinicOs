"use client";

import { useState } from "react";
import { inviteStaffAction } from "@/lib/actions/owner";
import { ASSIGNABLE_MODULES, ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";

export function InviteStaffForm() {
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(["patients", "appointments"]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    selectedModules.forEach((m) => formData.append("moduleKeys", m));
    const result = await inviteStaffAction(formData);
    if (result?.error) setError(result.error);
    else if (result?.inviteUrl) {
      setInviteUrl(result.inviteUrl);
      setEmailSent(Boolean(result.emailSent));
    }
    setLoading(false);
  }

  return (
    <div className="clinic-card p-6">
      <h3 className="mb-1 font-semibold">Invite Staff Member</h3>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">Email an invite link and preselect sidebar module access.</p>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {inviteUrl && (
        <Alert variant="success" className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span>{emailSent ? "Invite email sent." : "Invite created. Email is not configured, copy this link."}</span>
            <code className="text-xs font-mono break-all">{inviteUrl}</code>
            <CopyButton text={inviteUrl.startsWith("http") ? inviteUrl : `${window.location.origin}${inviteUrl}`} />
          </div>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Email" name="email" type="email" required placeholder="staff@clinic.com" />
        <Select
          label="Role"
          name="role"
          required
          options={ASSIGNABLE_ROLES.map((r) => ({
            value: r,
            label: r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          }))}
        />
        <div className="sm:col-span-2">
          <p className="clinic-label">Module Access</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ASSIGNABLE_MODULES.map((mod) => (
              <label key={mod} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm">
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
                <span className="capitalize">{mod.replace(/_/g, " ")}</span>
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" loading={loading}>Send Invite</Button>
      </form>
    </div>
  );
}
