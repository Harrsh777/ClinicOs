"use client";

import { useState, useTransition } from "react";
import { updateClinicModulesAction } from "@/lib/actions/platform-admin";
import { CORE_CLINIC_MODULES } from "@/lib/clinic/module-constants";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface ModuleItem {
  key: string;
  name: string;
  description?: string | null;
}

interface ClinicModulesEditorProps {
  clinicId: string;
  modules: ModuleItem[];
  enabledModules: Record<string, boolean>;
}

const MODULE_CATEGORIES: { label: string; keys: string[] }[] = [
  {
    label: "Core",
    keys: ["dashboard", "patients", "appointments", "queue", "staff", "settings", "permissions"],
  },
  {
    label: "Clinical",
    keys: ["consultations", "prescriptions", "certificates", "lab", "pharmacy", "inventory", "teleconsult"],
  },
  {
    label: "Finance",
    keys: ["billing", "insurance", "revenue", "accounting", "commissions", "finance"],
  },
  {
    label: "Advanced",
    keys: ["ai_insights", "branding", "franchise"],
  },
];

export function ClinicModulesEditor({ clinicId, modules, enabledModules }: ClinicModulesEditorProps) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(enabledModules);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const moduleByKey = Object.fromEntries(modules.map((m) => [m.key, m]));

  function toggleModule(key: string) {
    if (CORE_CLINIC_MODULES.includes(key as (typeof CORE_CLINIC_MODULES)[number])) return;
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectAll() {
    const next = { ...enabled };
    for (const m of modules) next[m.key] = true;
    setEnabled(next);
  }

  function deselectAll() {
    const next = { ...enabled };
    for (const m of modules) {
      next[m.key] = CORE_CLINIC_MODULES.includes(m.key as (typeof CORE_CLINIC_MODULES)[number]);
    }
    setEnabled(next);
  }

  function handleSave() {
    const payload = modules.map((m) => ({
      moduleKey: m.key,
      enabled: enabled[m.key] ?? true,
    }));

    startTransition(() => {
      void (async () => {
        const result = await updateClinicModulesAction(clinicId, payload);
        setMessage(result?.error ?? "Module access updated successfully");
      })();
    });
  }

  const enabledCount = modules.filter((m) => enabled[m.key] !== false).length;

  return (
    <div className="clinic-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Module access</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Choose which modules this clinic can use. Disabled modules are hidden from navigation and blocked at the route level.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={selectAll}>
            Enable all
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={deselectAll}>
            Disable optional
          </Button>
        </div>
      </div>

      {message && (
        <Alert variant={message.includes("success") ? "success" : "error"} className="mb-4">
          {message}
        </Alert>
      )}

      <p className="mb-4 text-sm text-[var(--text-muted)]">
        {enabledCount} of {modules.length} modules enabled
      </p>

      <div className="space-y-6">
        {MODULE_CATEGORIES.map((category) => {
          const categoryModules = category.keys
            .map((key) => moduleByKey[key])
            .filter((m): m is ModuleItem => !!m);

          if (categoryModules.length === 0) return null;

          return (
            <div key={category.label}>
              <p className="clinic-label mb-2">{category.label}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {categoryModules.map((mod) => {
                  const isCore = CORE_CLINIC_MODULES.includes(mod.key as (typeof CORE_CLINIC_MODULES)[number]);
                  const isOn = enabled[mod.key] !== false;

                  return (
                    <label
                      key={mod.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        isOn
                          ? "border-[var(--accent)]/30 bg-[var(--accent)]/5"
                          : "border-[var(--border)] bg-[var(--surface-2)]"
                      } ${isCore ? "opacity-70" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isOn}
                        disabled={isCore || pending}
                        onChange={() => toggleModule(mod.key)}
                        className="mt-0.5 h-4 w-4 rounded border-[var(--border)]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{mod.name}</span>
                        {mod.description && (
                          <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{mod.description}</span>
                        )}
                        {isCore && (
                          <span className="mt-1 block text-xs text-[var(--text-muted)]">Always enabled</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save module access"}
        </Button>
      </div>
    </div>
  );
}
