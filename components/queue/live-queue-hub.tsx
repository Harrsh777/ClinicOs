"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQueue } from "@/lib/hooks/use-live-queue";
import { QueueKpiBar } from "@/components/queue/queue-kpi-bar";
import { QueueSummaryPanel } from "@/components/queue/queue-summary-panel";
import { QueueTimelineBoard } from "@/components/queue/queue-timeline-board";
import { QueuePredictionPanel } from "@/components/queue/queue-prediction-panel";
import { DoctorAvailabilityPanel } from "@/components/queue/doctor-availability-panel";
import { Card, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  buildDoctorPredictions,
  computeQueueAnalytics,
  computeQueueSummary,
  getTokenCardVisual,
} from "@/lib/queue/types";
import {
  ExternalLink,
  History,
  ListOrdered,
  Monitor,
  Radio,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveQueueHubProps {
  clinicId: string;
  clinicSlug?: string;
  userRole: string;
  doctorId?: string;
  showCheckIn?: React.ReactNode;
}

export function LiveQueueHub({
  clinicId,
  clinicSlug,
  userRole,
  doctorId,
  showCheckIn,
}: LiveQueueHubProps) {
  const {
    session,
    tokens,
    doctors,
    clinicSettings,
    durationsByDoctor,
    auditLogs,
    loading,
    tick,
    refetch,
  } = useLiveQueue(clinicId);

  const [emergencyBanner, setEmergencyBanner] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const canManage = ["receptionist", "clinic_owner", "nurse", "administrator"].includes(userRole);
  const canOverride = ["clinic_owner", "administrator"].includes(userRole);
  const isDoctor = userRole === "doctor";

  const activeDoctors = doctors.filter(
    (d) => d.queue_status === "consulting" || d.queue_status === "available"
  ).length;

  const consultingCount = tokens.filter((t) => getTokenCardVisual(t) === "consulting").length;

  const analytics = useMemo(
    () => computeQueueAnalytics(tokens, durationsByDoctor, session?.avg_consultation_mins ?? 15),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokens, durationsByDoctor, session, tick]
  );

  const summary = useMemo(
    () => computeQueueSummary(tokens, doctors, durationsByDoctor, session?.avg_consultation_mins ?? 15),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokens, doctors, durationsByDoctor, session, tick]
  );

  const predictions = useMemo(() => {
    const map = new Map<string, number | null>();
    const durationMap = new Map(Object.entries(durationsByDoctor));
    const deptAvg =
      doctors.length > 0
        ? Math.round(
            doctors.reduce((s, d) => s + (d.avg_consultation_mins ?? d.slot_duration_mins ?? 15), 0) /
              doctors.length
          )
        : 15;

    for (const doctor of doctors) {
      const dp = buildDoctorPredictions(doctor, tokens, durationMap, deptAvg);
      for (const p of dp.predictions) {
        map.set(p.tokenId, p.estimatedMins);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, doctors, durationsByDoctor, tick]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="clinic-skeleton h-10 w-64 rounded-xl" />
        <div className="clinic-skeleton h-24 rounded-2xl" />
        <div className="clinic-skeleton h-32 rounded-2xl" />
        <div className="clinic-skeleton h-[360px] rounded-2xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        {showCheckIn}
        <EmptyState
          icon={<ListOrdered />}
          title="No queue session today"
          description={`Check in your first patient to start the live queue. Daily capacity: ${clinicSettings.dailyPatientCapacity} patients.`}
          action={
            <p className="text-sm text-[var(--text-muted)]">
              Daily target: <strong>{clinicSettings.dailyPatientCapacity}</strong> patients · Avg fee ₹{clinicSettings.avgFeePerPatient}
            </p>
          }
        />
      </div>
    );
  }

  return (
    <div className="queue-command-center space-y-5">
      {/* Command center header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
              Live Queue Command Center
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <Radio className="h-3 w-3 animate-pulse" />
              Real-time
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {analytics.totalPatientsSeen} seen · {analytics.dailyThroughput} throughput · {analytics.queueEfficiencyPct}% efficiency
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          {clinicSlug && (
            <Link href={`/queue/${clinicSlug}/display`} target="_blank">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Monitor className="h-3.5 w-3.5" />
                TV display
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setShowAudit(!showAudit)}>
            <History className="h-3.5 w-3.5" />
            Audit log
          </Button>
        </div>
      </div>

      <QueueKpiBar
        tokens={tokens}
        analytics={analytics}
        avgFee={clinicSettings.avgFeePerPatient}
        activeDoctors={activeDoctors}
        totalDoctors={doctors.length}
        consultingCount={consultingCount}
      />

      <QueueSummaryPanel summary={summary} />

      {showCheckIn && (
        <details className="group rounded-2xl border border-[var(--border)] bg-white/80 backdrop-blur-sm">
          <summary className="cursor-pointer list-none px-5 py-3.5 font-semibold text-sm text-[var(--text-primary)]">
            Check-in patient
            <span className="float-right text-[var(--text-muted)] group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="border-t border-[var(--border)] px-5 pb-5 pt-2">{showCheckIn}</div>
        </details>
      )}

      {/* Primary: Timeline board */}
      <Card className="!p-5 md:!p-6 bg-white/90 backdrop-blur-sm border-[var(--border)] shadow-[var(--shadow-md)]">
        <QueueTimelineBoard
          tokens={tokens}
          doctors={doctors}
          sessionId={session.id}
          canManage={canManage}
          canOverride={canOverride}
          isDoctor={isDoctor}
          doctorId={doctorId}
          predictions={predictions}
          emergencyBanner={emergencyBanner}
          onEmergencyDismiss={() => setEmergencyBanner(null)}
          onEmergencyInsert={setEmergencyBanner}
        />
      </Card>

      {/* ETA predictions sidebar-style panel */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="!p-5 lg:col-span-2">
          <QueuePredictionPanel
            doctors={doctors}
            tokens={tokens}
            durationsByDoctor={durationsByDoctor}
            tick={tick}
          />
        </Card>
        <Card className="!p-5">
          <h3 className="text-sm font-semibold mb-3">Today&apos;s analytics</h3>
          <div className="space-y-2.5">
            {[
              { label: "No show rate", value: `${analytics.noShowPct}%` },
              { label: "Cancellation rate", value: `${analytics.cancellationPct}%` },
              { label: "Daily throughput", value: analytics.dailyThroughput },
              { label: "Queue efficiency", value: `${analytics.queueEfficiencyPct}%` },
              { label: "Capacity used", value: `${Math.min(100, Math.round((tokens.length / clinicSettings.dailyPatientCapacity) * 100))}%` },
              { label: "Revenue est.", value: `₹${(analytics.totalPatientsSeen * clinicSettings.avgFeePerPatient).toLocaleString("en-IN")}` },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-xs border-b border-[var(--border)] pb-2 last:border-0">
                <span className="text-[var(--text-secondary)]">{row.label}</span>
                <span className="font-semibold tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Doctor availability at bottom */}
      <Card className="!p-5 bg-[var(--surface-1)]/50">
        <DoctorAvailabilityPanel
          doctors={doctors}
          tokens={tokens}
          durationsByDoctor={durationsByDoctor}
          canOverride={canOverride}
          currentDoctorId={doctorId}
        />
      </Card>

      {showAudit && (
        <Card className="!p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <History className="h-4 w-4" />
            Queue audit log
          </h3>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No queue actions logged yet.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs"
                  )}
                >
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {(log.profiles as { full_name?: string } | null)?.full_name ?? "Staff"}
                      <span className="text-[var(--text-muted)] font-normal"> · {log.action.replace(/_/g, " ")}</span>
                    </p>
                    {log.metadata && (log.metadata as { ip?: string }).ip && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        IP {(log.metadata as { ip?: string }).ip}
                      </p>
                    )}
                  </div>
                  <time className="shrink-0 text-[var(--text-muted)] tabular-nums">
                    {new Date(log.created_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
