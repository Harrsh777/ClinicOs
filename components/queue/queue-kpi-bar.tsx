"use client";

import { useState } from "react";
import {
  Activity,
  Clock,
  Hourglass,
  IndianRupee,
  Stethoscope,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  Zap,
} from "lucide-react";
import type { EnrichedQueueToken, QueueAnalytics } from "@/lib/queue/types";
import { formatDurationMins, getTokenCardVisual } from "@/lib/queue/types";
import { cn } from "@/lib/utils";

interface QueueKpiBarProps {
  tokens: EnrichedQueueToken[];
  analytics: QueueAnalytics;
  avgFee: number;
  activeDoctors: number;
  totalDoctors: number;
  consultingCount: number;
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative min-w-[130px] flex-1 overflow-hidden rounded-2xl border bg-white/80 backdrop-blur-sm p-4 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]",
        highlight ? "border-[var(--accent-500)]/30 ring-1 ring-[var(--accent-500)]/10" : "border-[var(--border)]"
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">{label}</p>
          <p className="mt-1.5 text-xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-[10px] text-[var(--text-secondary)] truncate">{sub}</p>}
        </div>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${accent}14`, color: accent }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function QueueKpiBar({
  tokens,
  analytics,
  avgFee,
  activeDoctors,
  totalDoctors,
  consultingCount,
}: QueueKpiBarProps) {
  const [now] = useState(() => Date.now());
  const waiting = tokens.filter((t) => getTokenCardVisual(t) === "waiting" || getTokenCardVisual(t) === "emergency" || getTokenCardVisual(t) === "vip" || getTokenCardVisual(t) === "returning");
  const completed = tokens.filter((t) => getTokenCardVisual(t) === "completed");
  const noShows = tokens.filter((t) => t.status === "no_show" || t.disposition === "no_show");
  const revenueToday = completed.length * avgFee;

  const completionLabel = analytics.estimatedCompletionAt
    ? analytics.estimatedCompletionAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    : "—";

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
      <KpiCard label="Waiting" value={waiting.length} icon={<Users className="h-4 w-4" />} accent="#10B981" highlight={waiting.length > 3} />
      <KpiCard label="Consulting" value={consultingCount} icon={<Activity className="h-4 w-4" />} accent="#3B82F6" highlight={consultingCount > 0} />
      <KpiCard label="Completed" value={completed.length} icon={<Zap className="h-4 w-4" />} accent="#64748B" />
      <KpiCard label="No shows" value={noShows.length} sub={`${analytics.noShowPct}% rate`} icon={<UserMinus className="h-4 w-4" />} accent="#EF4444" />
      <KpiCard label="Avg consult" value={`${analytics.avgConsultationMins}m`} icon={<Clock className="h-4 w-4" />} accent="#06B6D4" />
      <KpiCard label="Avg wait" value={`${analytics.avgWaitingMins}m`} icon={<Hourglass className="h-4 w-4" />} accent="#F59E0B" />
      <KpiCard label="Revenue" value={`₹${revenueToday.toLocaleString("en-IN")}`} icon={<IndianRupee className="h-4 w-4" />} accent="#14B8A6" />
      <KpiCard label="Doctors active" value={`${activeDoctors}/${totalDoctors}`} icon={<Stethoscope className="h-4 w-4" />} accent="#8B5CF6" />
      <KpiCard label="Efficiency" value={`${analytics.queueEfficiencyPct}%`} icon={<TrendingUp className="h-4 w-4" />} accent="#10B981" />
      <KpiCard
        label="Queue done by"
        value={completionLabel}
        sub={analytics.estimatedCompletionAt ? formatDurationMins(Math.round((analytics.estimatedCompletionAt.getTime() - now) / 60000)) + " left" : undefined}
        icon={<UserCheck className="h-4 w-4" />}
        accent="#0EA5E9"
        highlight
      />
    </div>
  );
}
