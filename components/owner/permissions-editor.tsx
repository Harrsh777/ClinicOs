"use client";

import { useState, useTransition } from "react";
import { updateStaffPermissionsAction } from "@/lib/actions/owner";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/card";
import type { PermissionLevel } from "@/lib/types/database";

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  staff_module_permissions?: { module_key: string; permission_level: PermissionLevel }[];
}

interface Module {
  key: string;
  name: string;
}

const LEVELS: PermissionLevel[] = ["read", "write", "admin"];

function toPermissionMap(member?: StaffMember) {
  const map: Record<string, PermissionLevel> = {};
  member?.staff_module_permissions?.forEach((p) => {
    map[p.module_key] = p.permission_level;
  });
  return map;
}

export function PermissionsEditor({ staff, modules }: { staff: StaffMember[]; modules: Module[] }) {
  const [selectedStaff, setSelectedStaff] = useState<string>(staff[0]?.id ?? "");
  const [perms, setPerms] = useState<Record<string, PermissionLevel>>(() => toPermissionMap(staff[0]));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadStaffPerms(staffId: string) {
    const member = staff.find((s) => s.id === staffId);
    setPerms(toPermissionMap(member));
    setSelectedStaff(staffId);
  }

  function handleSave() {
    const permissions = Object.entries(perms).map(([moduleKey, level]) => ({
      moduleKey,
      level,
    }));
    startTransition(() => {
      void (async () => {
        const result = await updateStaffPermissionsAction(selectedStaff, permissions);
        setMessage(result?.error ?? "Permissions saved successfully");
      })();
    });
  }

  if (!staff.length) {
    return (
      <EmptyState
        title="No staff members"
        description="Invite staff from the Staff Management page first"
      />
    );
  }

  return (
    <div className="clinic-card p-6">
      {message && (
        <Alert variant={message.includes("success") ? "success" : "error"} className="mb-4">
          {message}
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div>
          <p className="clinic-label">Staff Member</p>
          <div className="mt-2 space-y-2">
            {staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => loadStaffPerms(s.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                  selectedStaff === s.id
                    ? "border-teal-200 bg-teal-50 text-teal-800"
                    : "border-[var(--border)] bg-white hover:bg-[var(--surface-1)]"
                }`}
              >
                <span className="font-semibold">{s.full_name}</span>
                <span className="block text-xs text-[var(--text-muted)] capitalize">
                  {s.role.replace(/_/g, " ")}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="clinic-label mb-1">Module Permissions</p>
              <p className="text-sm text-[var(--text-secondary)]">Grant read, write, or admin access across the full sidebar.</p>
            </div>
            <span className="rounded-full bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              {modules.length} modules
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {modules.map((mod) => (
              <div key={mod.key} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{mod.name}</span>
                  <span className="rounded-full bg-[var(--surface-1)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {mod.key.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPerms((p) => ({ ...p, [mod.key]: level }))}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                        perms[mod.key] === level
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPerms((p) => { const n = { ...p }; delete n[mod.key]; return n; })}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--danger-500)]"
                  >
                    None
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={handleSave} loading={pending} className="mt-4">
            Save Permissions
          </Button>
        </div>
      </div>
    </div>
  );
}
