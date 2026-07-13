"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  MessageCircle,
  Send,
  Sparkles,
  UserX,
  Users,
} from "lucide-react";
import { PageHeader, Card, StatCard, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  generateRetentionMessageAction,
  sendBulkRetentionMessagesAction,
  sendRetentionMessageAction,
} from "@/lib/actions/patient-retention";
import {
  RETENTION_REASON_LABELS,
  type RetentionDashboardData,
  type RetentionPatientRow,
  type RetentionReason,
} from "@/lib/retention/types";
import { REMINDER_TYPE_LABELS } from "@/lib/engagement/types";
import { formatPhone } from "@/lib/utils";

type FilterKey = "all" | "on_track" | RetentionReason;

interface PatientRetentionDashboardProps {
  data: RetentionDashboardData;
}

function formatLastVisit(date: string | null, days: number | null) {
  if (!date) return "Never";
  const formatted = new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (days === null) return formatted;
  return `${formatted} (${days}d ago)`;
}

function reasonBadgeVariant(reason: RetentionReason) {
  if (reason === "doctor_attention") return "danger" as const;
  if (reason === "overdue_follow_up" || reason === "inactive_patient") return "warning" as const;
  return "info" as const;
}

export function PatientRetentionDashboard({ data }: PatientRetentionDashboardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkInstructions, setBulkInstructions] = useState("");
  const [composePatient, setComposePatient] = useState<RetentionPatientRow | null>(null);
  const [message, setMessage] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const onTrackCount = useMemo(
    () => data.patients.filter((p) => p.retentionReasons.length === 0).length,
    [data.patients]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return data.patients;
    if (filter === "on_track") {
      return data.patients.filter((p) => p.retentionReasons.length === 0);
    }
    return data.patients.filter((p) => p.retentionReasons.includes(filter));
  }, [data.patients, filter]);

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.patientId));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.patientId)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function openCompose(patient: RetentionPatientRow) {
    setComposePatient(patient);
    setMessage("");
    setAiInstructions("");
    setFeedback(null);
  }

  function closeCompose() {
    setComposePatient(null);
    setMessage("");
    setAiInstructions("");
  }

  const selectedIds = [...selected];

  return (
    <div>
      <PageHeader
        title="Patient Retention"
        subtitle={`All visited patients — send manual or AI-generated follow-ups via WhatsApp`}
        action={
          <Button
            loading={pending}
            disabled={selectedIds.length === 0}
            onClick={() => setBulkOpen(true)}
          >
            <Send className="h-4 w-4" />
            Send to {selectedIds.length || "selected"} ({data.stats.overdueThisMonth} overdue)
          </Button>
        }
      />

      {feedback && (
        <div className="mb-4 rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] px-4 py-3 text-sm text-[var(--brand-800)]">
          {feedback}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          label="Total visited"
          value={data.stats.totalVisited}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Overdue this month"
          value={data.stats.overdueThisMonth}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatCard
          label="Inactive (90d+)"
          value={data.stats.inactivePatients}
          icon={<UserX className="h-5 w-5" />}
        />
        <StatCard
          label="Doctor attention"
          value={data.stats.doctorAttention}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Ready to send"
          value={data.stats.readyToSend}
          icon={<MessageCircle className="h-5 w-5" />}
        />
        <StatCard
          label="At risk"
          value={data.stats.totalAtRisk}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <Card className="mb-4 !p-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All visited" count={data.patients.length} />
          {onTrackCount > 0 && (
            <FilterChip
              active={filter === "on_track"}
              onClick={() => setFilter("on_track")}
              label="On track"
              count={onTrackCount}
            />
          )}
          {(Object.keys(RETENTION_REASON_LABELS) as RetentionReason[]).map((key) => {
            const count = data.patients.filter((p) => p.retentionReasons.includes(key)).length;
            if (!count) return null;
            return (
              <FilterChip
                key={key}
                active={filter === key}
                onClick={() => setFilter(key)}
                label={RETENTION_REASON_LABELS[key]}
                count={count}
              />
            );
          })}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No visited patients yet"
          description="Patients will appear here after their first visit or consultation is recorded."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all patients"
                />
              </TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Last visit</TableHead>
              <TableHead>Visit reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Suggested action</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((patient) => (
              <TableRow key={patient.patientId}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(patient.patientId)}
                    onChange={() => toggleOne(patient.patientId)}
                    aria-label={`Select ${patient.patientName}`}
                  />
                </TableCell>
                <TableCell>
                  <p className="font-medium">{patient.patientName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatPhone(patient.patientPhone)}</p>
                </TableCell>
                <TableCell className="text-sm">
                  {formatLastVisit(patient.lastVisitAt, patient.daysSinceVisit)}
                </TableCell>
                <TableCell>
                  <p className="text-sm max-w-[200px] truncate" title={patient.visitReason}>
                    {patient.visitReason}
                  </p>
                  {patient.lastDiagnosis && patient.lastDiagnosis !== patient.visitReason && (
                    <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                      {patient.lastDiagnosis}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {patient.retentionReasons.length === 0 ? (
                      <Badge variant="success" className="text-[10px]">
                        On track
                      </Badge>
                    ) : (
                      patient.retentionReasons.map((r) => (
                        <Badge key={r} variant={reasonBadgeVariant(r)} className="text-[10px]">
                          {RETENTION_REASON_LABELS[r]}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-[var(--text-muted)]">
                  {REMINDER_TYPE_LABELS[patient.suggestedReminderType]}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => openCompose(patient)}>
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {bulkOpen && (
        <dialog
          open
          className="fixed inset-0 z-[60] m-auto w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-0 shadow-xl backdrop:bg-black/40"
          onClose={() => setBulkOpen(false)}
        >
          <div className="p-5 space-y-4">
            <h3 className="font-semibold text-lg">Bulk send — AI personalized messages</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Sending to {selectedIds.length} patients. Gemini will personalize each message using
              their visit reason, diagnosis, and last visit details.
            </p>
            <label className="block text-sm">
              <span className="font-medium">Optional instructions for all messages</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3 text-sm min-h-[80px]"
                placeholder='e.g. "Mention our free diabetes camp this Saturday"'
                value={bulkInstructions}
                onChange={(e) => setBulkInstructions(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await sendBulkRetentionMessagesAction({
                      patientIds: selectedIds,
                      useAi: true,
                      customInstructions: bulkInstructions || undefined,
                    });
                    setBulkOpen(false);
                    setBulkInstructions("");
                    setFeedback(
                      `Sent ${result.sent} message${result.sent === 1 ? "" : "s"}` +
                        (result.failed ? `, ${result.failed} failed` : "") +
                        (result.simulated ? " (simulated)" : "")
                    );
                    setSelected(new Set());
                    router.refresh();
                  })
                }
              >
                <Sparkles className="h-4 w-4" />
                Send with AI
              </Button>
            </div>
          </div>
        </dialog>
      )}

      {composePatient && (
        <dialog
          open
          className="fixed inset-0 z-[60] m-auto w-full max-w-xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-0 shadow-xl backdrop:bg-black/40"
          onClose={closeCompose}
        >
          <div className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Message {composePatient.patientName}</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Last visit: {formatLastVisit(composePatient.lastVisitAt, composePatient.daysSinceVisit)} ·{" "}
                {composePatient.visitReason}
              </p>
            </div>

            <label className="block text-sm">
              <span className="font-medium">AI instructions (optional)</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3 text-sm min-h-[60px]"
                placeholder='e.g. "Ask about their knee pain recovery and swelling"'
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
              />
            </label>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await generateRetentionMessageAction({
                      patientId: composePatient.patientId,
                      reminderType: composePatient.suggestedReminderType,
                      customInstructions: aiInstructions || undefined,
                    });
                    if (result.error) setFeedback(result.error);
                    else if (result.message) setMessage(result.message);
                  })
                }
              >
                <Sparkles className="h-4 w-4" />
                Generate with Gemini
              </Button>
            </div>

            <label className="block text-sm">
              <span className="font-medium">WhatsApp message</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3 text-sm min-h-[160px] font-mono"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message or click Generate with Gemini..."
              />
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeCompose}>
                Cancel
              </Button>
              <Button
                loading={pending}
                disabled={!message.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await sendRetentionMessageAction({
                      patientId: composePatient.patientId,
                      message,
                      reminderType: composePatient.suggestedReminderType,
                      reminderId: composePatient.reminderId,
                    });
                    if (result.error) {
                      setFeedback(result.error);
                    } else {
                      setFeedback(
                        `Message sent to ${composePatient.patientName}` +
                          (result.simulated ? " (simulated)" : "")
                      );
                      closeCompose();
                      router.refresh();
                    }
                  })
                }
              >
                <Send className="h-4 w-4" />
                Send WhatsApp
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--brand-500)] text-white"
          : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)]"
      }`}
    >
      {label} ({count})
    </button>
  );
}
