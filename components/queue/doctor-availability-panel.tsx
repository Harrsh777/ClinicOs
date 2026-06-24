"use client";

import { useMemo, useTransition } from "react";
import {
  updateDoctorQueueStatusAction,
  pauseDoctorQueueAction,
} from "@/lib/actions/queue-management";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DOCTOR_STATUS_LABELS,
  type DoctorQueueInfo,
  type DoctorQueueStatus,
  type EnrichedQueueToken,
  getConsultationDurationMins,
  getTokenCardVisual,
} from "@/lib/queue/types";
import { cn } from "@/lib/utils";
import {
  Coffee,
  LogIn,
  Pause,
  Play,
  Stethoscope,
  Siren,
  LogOut,
  Users,
  Clock,
  TrendingUp,
} from "lucide-react";

const STATUS_STYLES: Record<DoctorQueueStatus, string> = {
  not_arrived: "bg-slate-100 text-slate-600 border-slate-200",
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  consulting: "bg-blue-50 text-blue-700 border-blue-200",
  break: "bg-amber-50 text-amber-700 border-amber-200",
  emergency: "bg-red-50 text-red-700 border-red-200",
  offline: "bg-gray-100 text-gray-500 border-gray-200",
  finished: "bg-gray-100 text-gray-500 border-gray-200",
};

interface DoctorAvailabilityPanelProps {
  doctors: DoctorQueueInfo[];
  tokens: EnrichedQueueToken[];
  durationsByDoctor: Record<string, number[]>;
  canOverride: boolean;
  currentDoctorId?: string;
}

export function DoctorAvailabilityPanel({
  doctors,
  tokens,
  durationsByDoctor,
  canOverride,
  currentDoctorId,
}: DoctorAvailabilityPanelProps) {
  const [pending, startTransition] = useTransition();

  const doctorStats = useMemo(() => {
    return doctors.map((doctor) => {
      const doctorTokens = tokens.filter((t) => t.doctor_id === doctor.id);
      const waiting = doctorTokens.filter((t) => {
        const v = getTokenCardVisual(t);
        return v === "waiting" || v === "emergency" || v === "vip" || v === "returning";
      });
      const completed = doctorTokens.filter((t) => getTokenCardVisual(t) === "completed");
      const current = doctorTokens.find((t) => getTokenCardVisual(t) === "consulting");
      const durations = durationsByDoctor[doctor.id] ?? [];
      const avgConsult = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : doctor.avg_consultation_mins ?? doctor.slot_duration_mins ?? 15;
      const consultElapsed = current
        ? getConsultationDurationMins(current.consultation_started_at ?? current.serving_at, null)
        : null;

      return {
        doctor,
        waiting: waiting.length,
        completed: completed.length,
        currentPatient: current?.patients?.full_name ?? null,
        avgConsult,
        consultElapsed,
      };
    });
  }, [doctors, tokens, durationsByDoctor]);

  function setStatus(doctorId: string, status: DoctorQueueStatus, override = false) {
    startTransition(() => {
      void updateDoctorQueueStatusAction(doctorId, status, { override });
    });
  }

  function togglePause(doctorId: string, paused: boolean) {
    startTransition(() => {
      void pauseDoctorQueueAction(doctorId, paused);
    });
  }

  if (!doctors.length) {
    return (
      <Card className="!p-5">
        <p className="text-sm text-[var(--text-muted)]">No doctors on roster.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Doctor Availability</h3>
        <span className="text-xs text-[var(--text-muted)]">{doctors.length} on roster</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {doctorStats.map(({ doctor, waiting, completed, currentPatient, avgConsult, consultElapsed }) => {
          const status = (doctor.queue_status ?? "not_arrived") as DoctorQueueStatus;
          const isSelf = doctor.id === currentDoctorId;
          const canEdit = canOverride || isSelf;

          return (
            <Card
              key={doctor.id}
              className={cn(
                "!p-4 transition-all",
                status === "consulting" && "ring-1 ring-blue-200 shadow-[var(--shadow-md)]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-sm text-[var(--text-primary)]">
                    {doctor.profiles?.full_name ?? "Doctor"}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {doctor.department ?? doctor.specialization ?? "General"}
                    {doctor.room_number ? ` · Room ${doctor.room_number}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", STATUS_STYLES[status])}>
                  {DOCTOR_STATUS_LABELS[status]}
                </span>
              </div>

              {currentPatient && (
                <p className="mt-2 text-xs text-blue-700 font-medium flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {currentPatient}
                  {consultElapsed != null && (
                    <span className="text-[var(--text-muted)] font-normal">· {consultElapsed}m</span>
                  )}
                </p>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[var(--surface-1)] px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Waiting</p>
                  <p className="text-sm font-bold flex items-center justify-center gap-0.5">
                    <Users className="h-3 w-3 opacity-50" />
                    {waiting}
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--surface-1)] px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Avg</p>
                  <p className="text-sm font-bold flex items-center justify-center gap-0.5">
                    <Clock className="h-3 w-3 opacity-50" />
                    {avgConsult}m
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--surface-1)] px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Seen</p>
                  <p className="text-sm font-bold flex items-center justify-center gap-0.5">
                    <TrendingUp className="h-3 w-3 opacity-50" />
                    {completed}
                  </p>
                </div>
              </div>

              {canEdit && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {status === "not_arrived" && (
                    <Button size="sm" variant="secondary" className="h-7 text-[10px] gap-1" loading={pending}
                      onClick={() => setStatus(doctor.id, "available", canOverride && !isSelf)}>
                      <LogIn className="h-3 w-3" /> Arrived
                    </Button>
                  )}
                  {!doctor.queue_paused && status !== "finished" && status !== "offline" && (
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" loading={pending}
                      onClick={() => togglePause(doctor.id, true)}>
                      <Pause className="h-3 w-3" /> Break
                    </Button>
                  )}
                  {doctor.queue_paused && (
                    <Button size="sm" variant="secondary" className="h-7 text-[10px] gap-1" loading={pending}
                      onClick={() => togglePause(doctor.id, false)}>
                      <Play className="h-3 w-3" /> Resume
                    </Button>
                  )}
                  {canOverride && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-red-600" loading={pending}
                        onClick={() => setStatus(doctor.id, "emergency", true)}>
                        <Siren className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" loading={pending}
                        onClick={() => setStatus(doctor.id, "finished", true)}>
                        <LogOut className="h-3 w-3" /> Done
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" loading={pending}
                        onClick={() => setStatus(doctor.id, "offline", true)}>
                        Offline
                      </Button>
                    </>
                  )}
                  {status === "break" && <Coffee className="h-4 w-4 text-amber-500 ml-auto" />}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
