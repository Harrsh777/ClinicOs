"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { WalkInQuickForm } from "@/components/appointments/walk-in-quick-form";
import { BookAppointmentForm } from "@/components/appointments/book-appointment-form";
import type { ClinicFeeSetup } from "@/lib/billing/clinic-fees";
import { CalendarPlus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Doctor {
  id: string;
  profiles?: { full_name: string; specialization: string | null };
}

type HubTab = "walk_in" | "schedule";

export function AppointmentsHub({
  doctors,
  clinicId,
  feeSetup,
  defaultTab = "walk_in",
}: {
  doctors: Doctor[];
  clinicId: string;
  feeSetup: ClinicFeeSetup;
  defaultTab?: HubTab;
}) {
  const [tab, setTab] = useState<HubTab>(defaultTab);

  const tabs = [
    {
      key: "walk_in" as const,
      label: "Quick Walk-in",
      description: "New patient + vitals + queue",
      icon: UserPlus,
    },
    {
      key: "schedule" as const,
      label: "Book Appointment",
      description: "Existing or new patient, future slot",
      icon: CalendarPlus,
    },
  ];

  return (
    <Card className="mb-8 overflow-hidden p-0">
      <div className="flex border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 px-4 py-4 text-left transition-colors sm:px-6",
              tab === t.key
                ? "bg-[var(--surface-2)] border-b-2 border-[var(--brand-500)]"
                : "hover:bg-[var(--surface-2)]/60 border-b-2 border-transparent"
            )}
          >
            <div className="flex items-center gap-2">
              <t.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  tab === t.key ? "text-[var(--brand-500)]" : "text-[var(--text-muted)]"
                )}
              />
              <span className={cn("font-semibold text-sm", tab === t.key && "text-[var(--brand-600)]")}>
                {t.label}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 hidden sm:block">{t.description}</p>
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-6">
        {tab === "walk_in" ? (
          <WalkInQuickForm doctors={doctors} feeSetup={feeSetup} />
        ) : (
          <BookAppointmentForm doctors={doctors} clinicId={clinicId} isStaff embedded />
        )}
      </div>
    </Card>
  );
}
