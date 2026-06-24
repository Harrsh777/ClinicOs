"use client";

import { Clock, Hourglass, Timer, Users } from "lucide-react";
import type { QueueSummary } from "@/lib/queue/types";
import { formatDurationMins } from "@/lib/queue/types";
import { cn } from "@/lib/utils";

interface QueueSummaryPanelProps {
  summary: QueueSummary;
}

export function QueueSummaryPanel({ summary }: QueueSummaryPanelProps) {
  const items = [
    {
      label: "Current patient",
      value: summary.currentPatientRemainingMins != null
        ? `${summary.currentPatientRemainingMins} min remaining`
        : "—",
      icon: <Timer className="h-4 w-4" />,
      highlight: summary.currentPatientRemainingMins != null,
    },
    {
      label: "Patients remaining",
      value: String(summary.patientsRemaining),
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Avg consultation",
      value: `${summary.avgConsultationMins} min`,
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Queue completion",
      value: formatDurationMins(summary.estimatedQueueCompletionMins),
      icon: <Hourglass className="h-4 w-4" />,
      highlight: summary.patientsRemaining > 0,
    },
    {
      label: "Last patient finish",
      value: summary.estimatedLastPatientFinish
        ? summary.estimatedLastPatientFinish.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "—",
      icon: <Clock className="h-4 w-4" />,
    },
  ];

  return (
    <div className="queue-summary-panel rounded-2xl border border-[var(--border)] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-[var(--shadow-lg)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300/70">
            Total Queue Time
          </p>
          <p className="text-sm text-slate-300 mt-0.5">Live predictions · updates every 5s</p>
        </div>
        <span className="queue-live-dot flex items-center gap-1.5 rounded-full bg-teal-500/20 px-2.5 py-1 text-[10px] font-semibold text-teal-300">
          LIVE
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm",
              item.highlight && "border-teal-400/30 bg-teal-500/10"
            )}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {item.icon}
              {item.label}
            </div>
            <p className={cn(
              "mt-1.5 text-lg font-bold tracking-tight tabular-nums",
              item.highlight ? "text-teal-200" : "text-white"
            )}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
