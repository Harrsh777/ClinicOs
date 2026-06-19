"use client";

import { useState, useTransition, useEffect } from "react";
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

export function PermissionsEditor({ staff, modules }: { staff: StaffMember[]; modules: Module[] }) {
  const [selectedStaff, setSelectedStaff] = useState<string>(staff[0]?.id ?? "");
  const [perms, setPerms] = useState<Record<string, PermissionLevel>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadStaffPerms(staffId: string) {
    const member = staff.find((s) => s.id === staffId);
    const map: Record<string, PermissionLevel> = {};
    member?.staff_module_permissions?.forEach((p) => {
      map[p.module_key] = p.permission_level;
    });
    setPerms(map);
    setSelectedStaff(staffId);
  }

  useEffect(() => {
    if (staff[0]?.id) loadStaffPerms(staff[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff]);

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
    <div className="clinic-card p-5">
      {message && (
        <Alert variant={message.includes("success") ? "success" : "error"} className="mb-4">
          {message}
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <p className="clinic-label">Staff Member</p>
          <div className="space-y-1 mt-1">
            {staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => loadStaffPerms(s.id)}
                className={`w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors ${
                  selectedStaff === s.id
                    ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-medium"
                    : "hover:bg-[var(--surface-2)]"
                }`}
              >
                {s.full_name}
                <span className="block text-xs text-[var(--text-muted)] capitalize">
                  {s.role.replace(/_/g, " ")}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <p className="clinic-label mb-3">Module Permissions</p>
          <div className="space-y-3">
            {modules.map((mod) => (
              <div key={mod.key} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm font-medium">{mod.name}</span>
                <div className="flex gap-1">
                  {LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPerms((p) => ({ ...p, [mod.key]: level }))}
                      className={`px-2.5 py-1 text-xs rounded-[var(--radius-sm)] capitalize transition-colors ${
                        perms[mod.key] === level
                          ? "bg-[var(--brand-500)] text-white"
                          : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPerms((p) => { const n = { ...p }; delete n[mod.key]; return n; })}
                    className="px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--danger-500)]"
                  >
                    ✕
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
