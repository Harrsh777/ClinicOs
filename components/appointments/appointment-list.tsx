"use client";

import { useMemo, useState } from "react";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { formatTime, formatPhone } from "@/lib/utils";
import { EmptyState } from "@/components/ui/card";
import { Calendar, Phone, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppointmentRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  type: string;
  priority: string;
  notes?: string | null;
  patients?: { full_name: string; phone: string };
  doctors?: { profiles?: { full_name: string } };
}

type FilterKey = "all" | "today" | "pending" | "walk_in";

export function AppointmentList({
  appointments,
  showActions = true,
}: {
  appointments: AppointmentRow[];
  showActions?: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    switch (filter) {
      case "today":
        return appointments.filter((a) => a.appointment_date === today);
      case "pending":
        return appointments.filter((a) => a.status === "pending");
      case "walk_in":
        return appointments.filter((a) => a.type === "walk_in" || a.type === "emergency");
      default:
        return appointments;
    }
  }, [appointments, filter, today]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "pending", label: "Pending" },
    { key: "walk_in", label: "Walk-ins" },
  ];

  if (!appointments.length) {
    return <EmptyState icon={<Calendar />} title="No appointments" description="Walk-ins and bookings will appear here" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-lg">Appointments</h3>
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

      {filtered.length === 0 ? (
        <EmptyState icon={<Calendar />} title="No matching appointments" />
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => {
            const isToday = a.appointment_date === today;
            const isWalkIn = a.type === "walk_in" || a.type === "emergency";

            return (
              <div
                key={a.id}
                className={cn(
                  "rounded-[var(--radius-lg)] border p-4 transition-shadow hover:shadow-sm",
                  isToday
                    ? "border-[var(--brand-200)] bg-gradient-to-r from-[var(--brand-50)]/50 to-transparent"
                    : "border-[var(--border)] bg-[var(--surface-1)]"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-base">
                        {a.patients?.full_name ?? "Unknown patient"}
                      </span>
                      {isToday && <Badge variant="brand">Today</Badge>}
                      {isWalkIn && (
                        <Badge variant={a.type === "emergency" ? "danger" : "info"}>
                          {a.type.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <StatusBadge status={a.status} />
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(a.appointment_date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {formatTime(a.appointment_time)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5" />
                        {a.doctors?.profiles?.full_name ?? "—"}
                      </span>
                      {a.patients?.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {formatPhone(a.patients.phone)}
                        </span>
                      )}
                    </div>

                    {a.notes && (
                      <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                        <span className="font-medium text-[var(--text)]">Problem: </span>
                        {a.notes}
                      </p>
                    )}
                  </div>

                  {showActions && (
                    <div className="shrink-0">
                      <AppointmentActions appointmentId={a.id} status={a.status} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
