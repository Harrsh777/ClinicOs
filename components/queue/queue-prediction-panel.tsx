"use client";

import { Card } from "@/components/ui/card";
import {
  buildDoctorPredictions,
  type DoctorQueueInfo,
  type EnrichedQueueToken,
} from "@/lib/queue/types";
import { Clock, TrendingUp } from "lucide-react";

interface QueuePredictionPanelProps {
  doctors: DoctorQueueInfo[];
  tokens: EnrichedQueueToken[];
  durationsByDoctor: Record<string, number[]>;
  tick: number;
}

export function QueuePredictionPanel({
  doctors,
  tokens,
  durationsByDoctor,
}: QueuePredictionPanelProps) {
  const durationMap = new Map(Object.entries(durationsByDoctor));

  const allAvgs = doctors
    .map((d) => d.avg_consultation_mins ?? d.slot_duration_mins ?? 15)
    .filter(Boolean);
  const departmentAvg =
    allAvgs.length > 0
      ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length)
      : 15;

  const doctorPredictions = doctors.map((doctor) =>
    buildDoctorPredictions(
      doctor,
      tokens,
      durationMap,
      departmentAvg
    )
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Queue predictions</h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
          Live ETA
        </span>
      </div>

      <Card className="!p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-300/80">
          Smart ETA model
        </p>
        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
          70% doctor history · 20% today&apos;s avg · 10% department avg
        </p>
      </Card>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {doctorPredictions.map((dp) => (
          <Card key={dp.doctorId} className="!p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-sm font-semibold">{dp.doctorName}</p>
                <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Avg {dp.avgMins} min/consult
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-[var(--accent-500)]" />
            </div>
            {dp.predictions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No patients waiting</p>
            ) : (
              <div className="space-y-1.5">
                {dp.predictions.slice(0, 6).map((p, i) => (
                  <div
                    key={p.tokenId}
                    className="flex items-center justify-between rounded-lg bg-[var(--surface-1)] px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-[var(--text-primary)]">
                      {p.label}
                      {i === 0 && (
                        <span className="ml-2 text-[10px] text-[var(--text-muted)]">next</span>
                      )}
                    </span>
                    <span className="font-bold text-[var(--brand-600)] text-right">
                      {p.estimatedMins != null ? (
                        <>
                          ~{p.estimatedMins} min
                          {p.estimatedAt && (
                            <span className="block text-[10px] font-normal text-[var(--text-muted)]">
                              {p.estimatedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                            </span>
                          )}
                        </>
                      ) : "Paused"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
