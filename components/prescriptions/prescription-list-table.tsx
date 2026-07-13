"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pill, Printer, ExternalLink } from "lucide-react";

interface PrescriptionItem {
  medicine_name: string;
}

export interface PrescriptionListRow {
  id: string;
  created_at: string;
  status?: string;
  shared_at?: string | null;
  patient_id: string;
  consultation_id: string;
  patients?: { full_name: string; phone?: string } | null;
  doctors?: { profiles?: { full_name: string } | { full_name: string }[] } | null;
  prescription_items?: PrescriptionItem[];
}

type FilterKey = "all" | "today" | "shared" | "pending_dispense";

export function PrescriptionListTable({
  prescriptions,
  detailBasePath = "/owner/prescriptions",
  showPatientLink = true,
}: {
  prescriptions: PrescriptionListRow[];
  detailBasePath?: string;
  showPatientLink?: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    switch (filter) {
      case "today":
        return prescriptions.filter((rx) => rx.created_at.startsWith(today));
      case "shared":
        return prescriptions.filter((rx) => rx.shared_at);
      case "pending_dispense":
        return prescriptions.filter((rx) => rx.status === "finalized");
      default:
        return prescriptions;
    }
  }, [prescriptions, filter, today]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "shared", label: "Shared" },
    { key: "pending_dispense", label: "Awaiting dispense" },
  ];

  if (!prescriptions.length) {
    return (
      <EmptyState
        icon={<Pill />}
        title="No prescriptions"
        description="Prescriptions are created during consultations. Start a consultation to issue an e-prescription."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-lg">Prescription history</h3>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-[var(--brand-500)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((rx) => {
          const items = rx.prescription_items ?? [];
          const doc = rx.doctors?.profiles;
          const docName = Array.isArray(doc) ? doc[0]?.full_name : doc?.full_name;
          const preview = items
            .slice(0, 2)
            .map((i) => i.medicine_name)
            .join(", ");
          const more = items.length > 2 ? ` +${items.length - 2} more` : "";

          return (
            <div
              key={rx.id}
              className="clinic-card clinic-card-hover p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {showPatientLink ? (
                    <Link
                      href={`/owner/patients/${rx.patient_id}`}
                      className="font-semibold hover:text-[var(--brand-600)]"
                    >
                      {rx.patients?.full_name ?? "Patient"}
                    </Link>
                  ) : (
                    <span className="font-semibold">{rx.patients?.full_name ?? "Patient"}</span>
                  )}
                  <StatusBadge status={rx.status ?? "finalized"} />
                  {rx.shared_at && (
                    <span className="text-xs text-emerald-600 font-medium">Shared</span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {new Date(rx.created_at).toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {docName ? ` · Dr. ${docName}` : ""}
                  {items.length > 0 ? ` · ${items.length} medicine${items.length === 1 ? "" : "s"}` : ""}
                </p>
                {preview && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1 truncate">
                    {preview}
                    {more}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <Link href={`${detailBasePath}/${rx.id}`}>
                  <Button size="sm" variant="secondary" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Button>
                </Link>
                <Link href={`/print/prescription/${rx.id}`} target="_blank">
                  <Button size="sm" variant="ghost" className="gap-1.5">
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] text-center py-8">
          No prescriptions match this filter.
        </p>
      )}
    </div>
  );
}
