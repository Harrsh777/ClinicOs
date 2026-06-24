"use client";

import { useState, useTransition } from "react";
import { callNextTokenAction } from "@/lib/actions/queue";
import {
  assignTokenDoctorAction,
  callPatientAction,
  checkInPatientAction,
  completeBillingAction,
  completeConsultationQueueAction,
  completeTokenAndCallNextAction,
  enterRoomAction,
  insertEmergencyTokenAction,
  markFollowUpAction,
  markLeftClinicAction,
  markPatientArrivedAction,
  markTokenDispositionAction,
  pauseConsultationAction,
  reorderQueueTokenAction,
  sendToBillingAction,
  startConsultationQueueAction,
} from "@/lib/actions/queue-management";
import { startConsultationAction } from "@/lib/actions/consultations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type EnrichedQueueToken,
  type DoctorQueueInfo,
  type QueueCardVisual,
  JOURNEY_STAGE_LABELS,
  getConsultationDurationMins,
  getPatientTypeLabel,
  getTokenCardVisual,
  getWaitingDurationMins,
  formatTokenNumber,
  sortTimelineTokens,
} from "@/lib/queue/types";
import { cn, formatTime } from "@/lib/utils";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Clock,
  Phone,
  Siren,
  Stethoscope,
  UserCheck,
} from "lucide-react";

const CARD_STYLES: Record<QueueCardVisual, { card: string; connector: string; badge?: string }> = {
  completed: {
    card: "bg-slate-100/90 border-slate-200/80 text-slate-500",
    connector: "bg-slate-200",
  },
  waiting: {
    card: "bg-emerald-50 border-emerald-200/80 text-emerald-950 shadow-[0_2px_12px_rgba(16,185,129,0.08)]",
    connector: "bg-emerald-300",
  },
  consulting: {
    card: "bg-blue-50 border-blue-400/60 text-blue-950 queue-pulse-border shadow-[0_4px_24px_rgba(59,130,246,0.15)]",
    connector: "bg-blue-400",
  },
  emergency: {
    card: "bg-red-50 border-red-400/70 text-red-950 shadow-[0_4px_24px_rgba(239,68,68,0.2)]",
    connector: "bg-red-400",
    badge: "Emergency",
  },
  returning: {
    card: "bg-emerald-800/95 border-emerald-700 text-white shadow-[0_4px_20px_rgba(6,78,59,0.25)]",
    connector: "bg-emerald-600",
    badge: "Returning Patient",
  },
  vip: {
    card: "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300/80 text-amber-950 shadow-[0_4px_20px_rgba(245,158,11,0.12)]",
    connector: "bg-amber-400",
    badge: "VIP",
  },
  no_show: {
    card: "bg-red-50/60 border-red-200/50 text-red-400/80",
    connector: "bg-red-200",
  },
  cancelled: {
    card: "bg-slate-200/60 border-slate-300/50 text-slate-400",
    connector: "bg-slate-300",
  },
};

interface QueueTimelineBoardProps {
  tokens: EnrichedQueueToken[];
  doctors: DoctorQueueInfo[];
  sessionId: string;
  canManage: boolean;
  canOverride: boolean;
  isDoctor?: boolean;
  doctorId?: string;
  predictions?: Map<string, number | null>;
  emergencyBanner?: string | null;
  onEmergencyDismiss?: () => void;
  onEmergencyInsert?: (message: string) => void;
}

export function QueueTimelineBoard({
  tokens,
  doctors,
  sessionId,
  canManage,
  canOverride,
  isDoctor,
  doctorId,
  predictions,
  emergencyBanner,
  onEmergencyDismiss,
  onEmergencyInsert,
}: QueueTimelineBoardProps) {
  const [pending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const timeline = sortTimelineTokens(tokens);

  function run(action: () => Promise<unknown>) {
    startTransition(() => { void action(); });
  }

  return (
    <div className="space-y-5">
      {emergencyBanner && (
        <div className="flex items-center justify-between rounded-2xl border border-red-300/50 bg-red-500/10 px-5 py-3.5 text-sm font-medium text-red-800 backdrop-blur-sm">
          <span className="flex items-center gap-2">
            <Siren className="h-4 w-4 animate-pulse" />
            {emergencyBanner}
          </span>
          {onEmergencyDismiss && (
            <Button size="sm" variant="ghost" onClick={onEmergencyDismiss}>Dismiss</Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            Patient Flow Timeline
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {timeline.length} patients · scroll to explore the full queue
          </p>
        </div>
        {canManage && (
          <Button loading={pending} size="sm" className="gap-1.5 shrink-0" onClick={() => run(() => callNextTokenAction(sessionId))}>
            <Phone className="h-3.5 w-3.5" />
            Call next
          </Button>
        )}
      </div>

      {timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)]/50 py-20">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Queue is empty</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Check in a patient to begin the flow</p>
        </div>
      ) : (
        <div className="queue-timeline-scroll relative -mx-1 px-1 pb-2">
          <div className="flex items-stretch gap-0 min-w-max py-2">
            {timeline.map((token, index) => {
              const visual = getTokenCardVisual(token);
              const styles = CARD_STYLES[visual];
              const isLast = index === timeline.length - 1;

              return (
                <div key={token.id} className="flex items-center">
                  <TimelinePatientCard
                    token={token}
                    visual={visual}
                    styles={styles}
                    eta={predictions?.get(token.id)}
                    expanded={expandedId === token.id}
                    onToggle={() => setExpandedId(expandedId === token.id ? null : token.id)}
                    canManage={canManage}
                    canOverride={canOverride}
                    isDoctor={isDoctor}
                    doctorId={doctorId}
                    doctors={doctors}
                    sessionId={sessionId}
                    pending={pending}
                    onAction={run}
                    onEmergencyInsert={onEmergencyInsert}
                  />
                  {!isLast && (
                    <div className="flex flex-col items-center px-1 sm:px-2 shrink-0">
                      <div className={cn("h-0.5 w-6 sm:w-10 rounded-full", styles.connector)} />
                      <ArrowRight className={cn("h-3.5 w-3.5 mt-1 opacity-40", visual === "consulting" && "text-blue-500 opacity-80")} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-[var(--border)]">
        {(
          [
            ["waiting", "Waiting", "bg-emerald-400"],
            ["consulting", "In Consultation", "bg-blue-500"],
            ["completed", "Completed", "bg-slate-300"],
            ["emergency", "Emergency", "bg-red-500"],
            ["returning", "Returning", "bg-emerald-700"],
            ["vip", "VIP", "bg-amber-400"],
          ] as const
        ).map(([, label, color]) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)]">
            <span className={cn("h-2 w-2 rounded-full", color)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimelinePatientCard({
  token,
  visual,
  styles,
  eta,
  expanded,
  onToggle,
  canManage,
  canOverride,
  isDoctor,
  doctorId,
  doctors,
  sessionId,
  pending,
  onAction,
  onEmergencyInsert,
}: {
  token: EnrichedQueueToken;
  visual: QueueCardVisual;
  styles: (typeof CARD_STYLES)[QueueCardVisual];
  eta?: number | null;
  expanded: boolean;
  onToggle: () => void;
  canManage: boolean;
  canOverride: boolean;
  isDoctor?: boolean;
  doctorId?: string;
  doctors: DoctorQueueInfo[];
  sessionId: string;
  pending: boolean;
  onAction: (fn: () => Promise<unknown>) => void;
  onEmergencyInsert?: (message: string) => void;
}) {
  const label = token.token_label ?? formatTokenNumber(token.token_number);
  const patient = token.patients;
  const waitMins = getWaitingDurationMins(token.checked_in_at, token.created_at);
  const consultMins = getConsultationDurationMins(
    token.consultation_started_at ?? token.serving_at,
    token.consultation_completed_at ?? token.completed_at
  );
  const journeyLabel = JOURNEY_STAGE_LABELS[token.journey_stage ?? "waiting"] ?? token.status;
  const isConsulting = visual === "consulting";
  const isWaiting = visual === "waiting" || visual === "emergency" || visual === "vip" || visual === "returning";
  const isOwnPatient = isDoctor && token.doctor_id === doctorId;

  return (
    <div
      className={cn(
        "queue-timeline-card relative flex flex-col rounded-2xl border-2 transition-all duration-300",
        "w-[200px] sm:w-[220px] lg:w-[240px] min-h-[280px]",
        styles.card,
        expanded && "ring-2 ring-[var(--accent-500)]/30 scale-[1.02] z-10"
      )}
    >
      {/* Token number header */}
      <button type="button" className="flex-1 text-left p-4" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <span className={cn(
            "text-3xl font-black tracking-tighter tabular-nums",
            visual === "returning" ? "text-white" : "text-[var(--text-primary)]"
          )}>
            {label}
          </span>
          {styles.badge && (
            <Badge
              variant={visual === "emergency" ? "danger" : "brand"}
              className={cn("text-[9px] shrink-0", visual === "returning" && "bg-white/20 text-white border-white/30")}
            >
              {styles.badge}
            </Badge>
          )}
        </div>

        <p className={cn(
          "mt-2 font-semibold text-sm leading-tight truncate",
          visual === "returning" ? "text-white" : ""
        )}>
          {patient?.full_name ?? "Patient"}
        </p>

        {token.doctors?.profiles?.full_name && (
          <p className={cn("mt-1 text-[11px] flex items-center gap-1 truncate", visual === "returning" ? "text-emerald-100" : "text-[var(--text-secondary)]")}>
            <Stethoscope className="h-3 w-3 shrink-0" />
            {token.doctors.profiles.full_name}
          </p>
        )}

        <div className={cn("mt-3 space-y-1 text-[10px]", visual === "returning" ? "text-emerald-100/90" : "text-[var(--text-muted)]")}>
          {token.appointments?.appointment_time && (
            <div className="flex justify-between">
              <span>Appt</span>
              <span className="font-medium">{formatTime(token.appointments.appointment_time)}</span>
            </div>
          )}
          {token.checked_in_at && (
            <div className="flex justify-between">
              <span>Check-in</span>
              <span className="font-medium">
                {new Date(token.checked_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Status</span>
            <span className="font-semibold">{journeyLabel}</span>
          </div>
          <div className="flex justify-between">
            <span>Type</span>
            <span className="font-medium">{getPatientTypeLabel(token)}</span>
          </div>
        </div>

        {/* Live timers */}
        <div className={cn("mt-3 pt-3 border-t", visual === "returning" ? "border-white/20" : "border-black/5")}>
          {isConsulting && consultMins != null && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
              <span className="queue-live-dot" />
              <Clock className="h-3 w-3" />
              {consultMins} min live
            </div>
          )}
          {visual === "completed" && consultMins != null && (
            <p className="text-[11px] font-medium opacity-70">Consulted {consultMins} min</p>
          )}
          {isWaiting && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Waiting {waitMins}m
              </span>
              {eta != null && (
                <span className={cn("font-bold", visual === "returning" ? "text-emerald-200" : "text-[var(--brand-600)]")}>
                  ETA {eta}m
                </span>
              )}
            </div>
          )}
        </div>

        <ChevronDown className={cn(
          "mx-auto mt-2 h-4 w-4 opacity-40 transition-transform",
          expanded && "rotate-180",
          visual === "returning" && "text-white"
        )} />
      </button>

      {expanded && (
        <div className={cn(
          "border-t px-3 pb-3 pt-2 space-y-2",
          visual === "returning" ? "border-white/20" : "border-black/5"
        )}>
          {/* Receptionist actions */}
          {canManage && isWaiting && (
            <ActionGroup label="Reception">
              {!token.checked_in_at && (
                <ActionBtn pending={pending} onClick={() => onAction(() => checkInPatientAction(token.id))}>
                  <UserCheck className="h-3 w-3" /> Check in
                </ActionBtn>
              )}
              {token.checked_in_at && !token.arrived_at && (
                <ActionBtn pending={pending} onClick={() => onAction(() => markPatientArrivedAction(token.id))}>
                  Arrived
                </ActionBtn>
              )}
              <ActionBtn pending={pending} onClick={() => onAction(() => callPatientAction(token.id))}>
                <Phone className="h-3 w-3" /> Call
              </ActionBtn>
              <ActionBtn pending={pending} onClick={() => onAction(() => reorderQueueTokenAction(token.id, "up"))}>
                <ArrowUp className="h-3 w-3" />
              </ActionBtn>
              <ActionBtn pending={pending} onClick={() => onAction(() => reorderQueueTokenAction(token.id, "down"))}>
                <ArrowDown className="h-3 w-3" />
              </ActionBtn>
              {(canOverride || canManage) && (
                <ActionBtn pending={pending} variant="danger" onClick={() => onAction(async () => {
                  const res = await insertEmergencyTokenAction(token.id);
                  if (res.success && onEmergencyInsert) onEmergencyInsert(res.banner ?? "Emergency inserted");
                })}>
                  <Siren className="h-3 w-3" />
                </ActionBtn>
              )}
            </ActionGroup>
          )}

          {/* Doctor actions */}
          {(isOwnPatient || canManage) && (isConsulting || token.status === "called") && (
            <ActionGroup label="Doctor">
              {token.status === "called" && (
                <ActionBtn pending={pending} onClick={() => onAction(() => enterRoomAction(token.id))}>
                  Entered room
                </ActionBtn>
              )}
              {token.status !== "serving" && (
                <ActionBtn pending={pending} onClick={() => onAction(() =>
                  isDoctor
                    ? startConsultationAction({
                        patientId: token.patient_id,
                        doctorId: token.doctor_id!,
                        appointmentId: token.appointment_id ?? undefined,
                        queueTokenId: token.id,
                      })
                    : startConsultationQueueAction(token.id)
                )}>
                  Start consult
                </ActionBtn>
              )}
              {token.status === "serving" && (
                <>
                  <ActionBtn pending={pending} onClick={() => onAction(() => pauseConsultationAction(token.id))}>
                    Pause
                  </ActionBtn>
                  <ActionBtn pending={pending} onClick={() => onAction(() =>
                    completeTokenAndCallNextAction(token.id, sessionId)
                  )}>
                    Complete
                  </ActionBtn>
                  <ActionBtn pending={pending} onClick={() => onAction(() => sendToBillingAction(token.id))}>
                    To billing
                  </ActionBtn>
                  <ActionBtn pending={pending} onClick={() => onAction(() => markFollowUpAction(token.id))}>
                    Follow-up
                  </ActionBtn>
                </>
              )}
            </ActionGroup>
          )}

          {canManage && token.status === "completed" && !token.billing_completed_at && (
            <ActionGroup label="Billing">
              {!token.billing_started_at && (
                <ActionBtn pending={pending} onClick={() => onAction(() => sendToBillingAction(token.id))}>
                  Start billing
                </ActionBtn>
              )}
              <ActionBtn pending={pending} onClick={() => onAction(() => completeBillingAction(token.id))}>
                Complete billing
              </ActionBtn>
              <ActionBtn pending={pending} onClick={() => onAction(() => markLeftClinicAction(token.id))}>
                Left clinic
              </ActionBtn>
            </ActionGroup>
          )}

          {canManage && isWaiting && (
            <ActionGroup label="Disposition">
              <ActionBtn pending={pending} variant="danger" onClick={() => onAction(() => markTokenDispositionAction(token.id, "no_show"))}>
                No show
              </ActionBtn>
              <ActionBtn pending={pending} onClick={() => onAction(() => markTokenDispositionAction(token.id, "cancelled"))}>
                Cancel
              </ActionBtn>
            </ActionGroup>
          )}

          {canManage && doctors.length > 1 && isWaiting && (
            <select
              className="clinic-input text-[10px] py-1 w-full"
              value={token.doctor_id ?? ""}
              onChange={(e) => onAction(() => assignTokenDoctorAction(token.id, e.target.value))}
            >
              <option value="">Transfer doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.profiles?.full_name}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

function ActionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-50 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function ActionBtn({
  children,
  pending,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  pending: boolean;
  onClick: () => void;
  variant?: "danger";
}) {
  return (
    <Button
      size="sm"
      variant={variant === "danger" ? "ghost" : "secondary"}
      className={cn("h-6 text-[10px] gap-1 px-2", variant === "danger" && "text-red-600")}
      loading={pending}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
