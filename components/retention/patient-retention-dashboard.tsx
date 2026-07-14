"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarClock,
  IndianRupee,
  Mail,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { PageHeader, Card, StatCard, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  sendBulkRetentionEmailsAction,
  sendBulkRetentionMessagesAction,
  sendRetentionBroadcastAction,
  sendRetentionEmailBroadcastAction,
  updateRetentionPatientFieldsAction,
} from "@/lib/actions/patient-retention";
import { RetentionWhatsAppModal } from "@/components/retention/retention-whatsapp-modal";
import { RetentionEmailModal } from "@/components/retention/retention-email-modal";
import { RetentionImportPanel } from "@/components/retention/retention-import-panel";
import { RetentionAIInsights } from "@/components/retention/retention-ai-insights";
import type { RetentionInsightFilterKey } from "@/lib/retention/insights";
import { filesToEmailAttachments } from "@/lib/retention/email-attachments";
import {
  RETENTION_REASON_LABELS,
  RETENTION_SORT_LABELS,
  type RetentionDashboardData,
  type RetentionPatientRow,
  type RetentionReason,
  type RetentionSortKey,
} from "@/lib/retention/types";
import { REMINDER_TYPE_LABELS } from "@/lib/engagement/types";
import { formatPhone } from "@/lib/utils";

type FilterKey = "all" | "on_track" | "has_dues" | "no_visit" | RetentionReason;

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

function formatCurrency(amount: number) {
  if (amount <= 0) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function reasonBadgeVariant(reason: RetentionReason) {
  if (reason === "doctor_attention" || reason === "has_dues") return "danger" as const;
  if (reason === "overdue_follow_up" || reason === "inactive_patient") return "warning" as const;
  return "info" as const;
}

function sortPatients(patients: RetentionPatientRow[], sortKey: RetentionSortKey) {
  const sorted = [...patients];
  switch (sortKey) {
    case "name_asc":
      return sorted.sort((a, b) => a.patientName.localeCompare(b.patientName));
    case "name_desc":
      return sorted.sort((a, b) => b.patientName.localeCompare(a.patientName));
    case "last_visit_newest":
      return sorted.sort((a, b) => {
        const aTime = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0;
        const bTime = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0;
        return bTime - aTime;
      });
    case "last_visit_oldest":
      return sorted.sort((a, b) => {
        const aTime = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : Infinity;
        const bTime = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : Infinity;
        return aTime - bTime;
      });
    case "dues_high":
      return sorted.sort((a, b) => b.dueAmount - a.dueAmount);
    case "dues_low":
      return sorted.sort((a, b) => a.dueAmount - b.dueAmount);
    case "priority":
    default:
      return sorted.sort((a, b) => {
        const priority = (r: RetentionPatientRow) =>
          (r.retentionReasons.length ? 10000 : 0) +
          (r.retentionReasons.includes("doctor_attention") ? 1000 : 0) +
          (r.retentionReasons.includes("has_dues") ? 800 : 0) +
          (r.retentionReasons.includes("overdue_follow_up") ? 500 : 0) +
          (r.daysSinceVisit ?? 0);
        return priority(b) - priority(a);
      });
  }
}

export function PatientRetentionDashboard({ data }: PatientRetentionDashboardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<RetentionSortKey>("priority");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkChannel, setBulkChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [bulkMode, setBulkMode] = useState<"ai" | "broadcast">("broadcast");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkInstructions, setBulkInstructions] = useState("");
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailBody, setBulkEmailBody] = useState("");
  const [bulkEmailFiles, setBulkEmailFiles] = useState<File[]>([]);
  const bulkEmailFileRef = useRef<HTMLInputElement>(null);
  const [composePatient, setComposePatient] = useState<RetentionPatientRow | null>(null);
  const [composeEmailPatient, setComposeEmailPatient] = useState<RetentionPatientRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    visitReason: string;
    dueAmount: string;
    lastVisitDate: string;
  }>({ visitReason: "", dueAmount: "", lastVisitDate: "" });

  const onTrackCount = useMemo(
    () => data.patients.filter((p) => p.retentionReasons.length === 0).length,
    [data.patients]
  );

  const filtered = useMemo(() => {
    let list = data.patients;
    if (filter === "all") list = data.patients;
    else if (filter === "on_track") {
      list = data.patients.filter((p) => p.retentionReasons.length === 0);
    } else if (filter === "has_dues") {
      list = data.patients.filter((p) => p.dueAmount > 0);
    } else if (filter === "no_visit") {
      list = data.patients.filter((p) => !p.hasVisitHistory);
    } else {
      list = data.patients.filter((p) => p.retentionReasons.includes(filter));
    }
    return sortPatients(list, sortKey);
  }, [data.patients, filter, sortKey]);

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.patientId));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.patientId)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function startEdit(patient: RetentionPatientRow) {
    setEditingId(patient.patientId);
    setEditDraft({
      visitReason: patient.visitReason === "—" ? "" : patient.visitReason,
      dueAmount: patient.dueAmount > 0 ? String(patient.dueAmount) : "",
      lastVisitDate: patient.lastVisitAt
        ? new Date(patient.lastVisitAt).toISOString().split("T")[0]
        : "",
    });
  }

  function saveEdit(patientId: string) {
    startTransition(async () => {
      const result = await updateRetentionPatientFieldsAction({
        patientId,
        visitReason: editDraft.visitReason,
        dueAmount: editDraft.dueAmount ? Number(editDraft.dueAmount) : 0,
        lastVisitDate: editDraft.lastVisitDate || null,
      });
      if (result.error) setFeedback(result.error);
      else {
        setEditingId(null);
        setFeedback("Patient updated");
        router.refresh();
      }
    });
  }

  const selectedIds = [...selected];

  const selectedEmailCount = useMemo(
    () => data.patients.filter((p) => selected.has(p.patientId) && p.patientEmail).length,
    [data.patients, selected]
  );

  function resetBulkForm() {
    setBulkMessage("");
    setBulkInstructions("");
    setBulkEmailSubject("");
    setBulkEmailBody("");
    setBulkEmailFiles([]);
  }

  return (
    <div>
      <PageHeader
        title="Patient Retention"
        subtitle="Manage your patient list, track dues, and send follow-up WhatsApp or email messages"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add / Import
            </Button>
            <Button
              loading={pending}
              disabled={selectedIds.length === 0}
              onClick={() => setBulkOpen(true)}
            >
              <Send className="h-4 w-4" />
              Broadcast ({selectedIds.length || 0})
            </Button>
          </div>
        }
      />

      {feedback && (
        <div className="mb-4 rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] px-4 py-3 text-sm text-[var(--brand-800)]">
          {feedback}
        </div>
      )}

      <div className="mb-6 grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard label="Total patients" value={data.stats.totalPatients} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Visited" value={data.stats.totalVisited} icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard
          label="With dues"
          value={data.stats.withDues}
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <StatCard
          label="Total dues"
          value={formatCurrency(data.stats.totalDues)}
          icon={<IndianRupee className="h-5 w-5" />}
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
          label="At risk"
          value={data.stats.totalAtRisk}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <Card className="mb-4 !p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)] mr-1">Filter:</span>
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={data.patients.length} />
          {onTrackCount > 0 && (
            <FilterChip active={filter === "on_track"} onClick={() => setFilter("on_track")} label="On track" count={onTrackCount} />
          )}
          {data.stats.withDues > 0 && (
            <FilterChip active={filter === "has_dues"} onClick={() => setFilter("has_dues")} label="Has dues" count={data.stats.withDues} />
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
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
          <ArrowUpDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span className="text-xs font-medium text-[var(--text-muted)]">Sort:</span>
          {(Object.keys(RETENTION_SORT_LABELS) as RetentionSortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                sortKey === key
                  ? "bg-[var(--surface-2)] text-[var(--brand-700)] ring-1 ring-[var(--brand-200)]"
                  : "text-[var(--text-muted)] hover:text-[var(--brand-600)]"
              }`}
            >
              {RETENTION_SORT_LABELS[key]}
            </button>
          ))}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No patients yet"
          description="Add patients manually or import a CSV to start sending retention messages."
          action={
            <Button onClick={() => setImportOpen(true)}>
              <Plus className="h-4 w-4" />
              Add patients
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Last visit</TableHead>
              <TableHead>Visit reason</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Suggested action</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((patient) => {
              const isEditing = editingId === patient.patientId;
              return (
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
                    {patient.patientEmail && (
                      <p className="text-xs text-[var(--text-muted)] truncate max-w-[180px]">
                        {patient.patientEmail}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {isEditing ? (
                      <input
                        type="date"
                        value={editDraft.lastVisitDate}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, lastVisitDate: e.target.value }))
                        }
                        className="w-full rounded border border-[var(--border)] px-2 py-1 text-xs"
                      />
                    ) : (
                      formatLastVisit(patient.lastVisitAt, patient.daysSinceVisit)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editDraft.visitReason}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, visitReason: e.target.value }))
                        }
                        className="w-full max-w-[180px] rounded border border-[var(--border)] px-2 py-1 text-sm"
                        placeholder="Visit reason"
                      />
                    ) : (
                      <>
                        <p className="text-sm max-w-[200px] truncate" title={patient.visitReason}>
                          {patient.visitReason}
                        </p>
                        {patient.lastDiagnosis && patient.lastDiagnosis !== patient.visitReason && (
                          <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                            {patient.lastDiagnosis}
                          </p>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        value={editDraft.dueAmount}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, dueAmount: e.target.value }))
                        }
                        className="w-20 rounded border border-[var(--border)] px-2 py-1 text-sm"
                        placeholder="0"
                      />
                    ) : (
                      <span
                        className={
                          patient.dueAmount > 0 ? "font-medium text-amber-700" : "text-[var(--text-muted)]"
                        }
                      >
                        {formatCurrency(patient.dueAmount)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {!patient.hasVisitHistory && (
                        <Badge variant="info" className="text-[10px]">
                          No visit yet
                        </Badge>
                      )}
                      {patient.retentionReasons.length === 0 ? (
                        patient.hasVisitHistory && (
                          <Badge variant="success" className="text-[10px]">
                            On track
                          </Badge>
                        )
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
                    {patient.hasVisitHistory
                      ? REMINDER_TYPE_LABELS[patient.suggestedReminderType]
                      : "Add visit details"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" loading={pending} onClick={() => saveEdit(patient.patientId)}>
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(patient)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setComposePatient(patient)}>
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!patient.patientEmail}
                            title={patient.patientEmail ? "Send email" : "No email on file"}
                            onClick={() => setComposeEmailPatient(patient)}
                          >
                            <Mail className="h-4 w-4" />
                            Email
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <RetentionAIInsights
        data={data}
        onFilterChange={(key: RetentionInsightFilterKey) => setFilter(key)}
      />

      {importOpen && (
        <RetentionImportPanel
          onClose={() => setImportOpen(false)}
          onSuccess={(msg) => {
            setFeedback(msg);
            router.refresh();
          }}
        />
      )}

      {composePatient && (
        <RetentionWhatsAppModal
          patient={composePatient}
          clinicName={data.clinicName}
          onClose={() => setComposePatient(null)}
          onSent={(msg) => {
            setFeedback(msg);
            router.refresh();
          }}
        />
      )}

      {composeEmailPatient && (
        <RetentionEmailModal
          patient={composeEmailPatient}
          clinicName={data.clinicName}
          onClose={() => setComposeEmailPatient(null)}
          onSent={(msg) => {
            setFeedback(msg);
            router.refresh();
          }}
        />
      )}

      {bulkOpen && (
        <dialog
          open
          className="fixed inset-0 z-[60] m-auto w-full max-w-2xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-0 shadow-xl backdrop:bg-black/40"
          onClose={() => setBulkOpen(false)}
        >
          <div className="p-5 space-y-4">
            <h3 className="font-semibold text-lg">Send to {selectedIds.length} patients</h3>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBulkChannel("whatsapp")}
                className={`flex-1 rounded-lg border p-3 text-left text-sm ${
                  bulkChannel === "whatsapp"
                    ? "border-[var(--brand-400)] bg-[var(--brand-50)]"
                    : "border-[var(--border)]"
                }`}
              >
                <p className="font-medium flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Text message broadcast</p>
              </button>
              <button
                type="button"
                onClick={() => setBulkChannel("email")}
                className={`flex-1 rounded-lg border p-3 text-left text-sm ${
                  bulkChannel === "email"
                    ? "border-[var(--brand-400)] bg-[var(--brand-50)]"
                    : "border-[var(--border)]"
                }`}
              >
                <p className="font-medium flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  Email
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {selectedEmailCount} of {selectedIds.length} have email
                </p>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBulkMode("broadcast")}
                className={`flex-1 rounded-lg border p-3 text-left text-sm ${
                  bulkMode === "broadcast"
                    ? "border-[var(--brand-400)] bg-[var(--brand-50)]"
                    : "border-[var(--border)]"
                }`}
              >
                <p className="font-medium">
                  {bulkChannel === "email" ? "Same email" : "Same message"}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {bulkChannel === "email"
                    ? "One subject and body for everyone"
                    : 'e.g. "Monsoon season — get a dengue checkup"'}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setBulkMode("ai")}
                className={`flex-1 rounded-lg border p-3 text-left text-sm ${
                  bulkMode === "ai"
                    ? "border-[var(--brand-400)] bg-[var(--brand-50)]"
                    : "border-[var(--border)]"
                }`}
              >
                <p className="font-medium">AI personalized</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Unique {bulkChannel === "email" ? "email" : "message"} per patient
                </p>
              </button>
            </div>

            {bulkChannel === "whatsapp" ? (
              bulkMode === "broadcast" ? (
                <label className="block text-sm">
                  <span className="font-medium">Message for all patients</span>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3 text-sm min-h-[120px]"
                    placeholder="Monsoon season is here! Come visit us for a dengue & dental checkup. Book your slot today."
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                  />
                </label>
              ) : (
                <label className="block text-sm">
                  <span className="font-medium">Optional instructions for AI</span>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3 text-sm min-h-[80px]"
                    placeholder='e.g. "Mention our free diabetes camp this Saturday"'
                    value={bulkInstructions}
                    onChange={(e) => setBulkInstructions(e.target.value)}
                  />
                </label>
              )
            ) : bulkMode === "broadcast" ? (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="font-medium">Subject</span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm"
                    placeholder="Health check-in from your clinic"
                    value={bulkEmailSubject}
                    onChange={(e) => setBulkEmailSubject(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Email body</span>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3 text-sm min-h-[140px]"
                    placeholder="Write your email message for all selected patients…"
                    value={bulkEmailBody}
                    onChange={(e) => setBulkEmailBody(e.target.value)}
                  />
                </label>
                <div>
                  <input
                    ref={bulkEmailFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).filter((f) =>
                        f.type.startsWith("image/")
                      );
                      setBulkEmailFiles((current) => [...current, ...files].slice(0, 5));
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => bulkEmailFileRef.current?.click()}
                  >
                    Attach images ({bulkEmailFiles.length}/5)
                  </Button>
                  {bulkEmailFiles.length > 0 && (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {bulkEmailFiles.map((f) => f.name).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="font-medium">Optional instructions for AI</span>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3 text-sm min-h-[80px]"
                    placeholder='e.g. "Invite them for a seasonal health camp"'
                    value={bulkInstructions}
                    onChange={(e) => setBulkInstructions(e.target.value)}
                  />
                </label>
                <div>
                  <input
                    ref={bulkEmailFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).filter((f) =>
                        f.type.startsWith("image/")
                      );
                      setBulkEmailFiles((current) => [...current, ...files].slice(0, 5));
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => bulkEmailFileRef.current?.click()}
                  >
                    Attach images to all emails ({bulkEmailFiles.length}/5)
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-[var(--text-muted)]">
              {bulkChannel === "whatsapp"
                ? "Patients can reply on WhatsApp and staff will see it in Conversations."
                : selectedEmailCount < selectedIds.length
                  ? `Patients without email on file will be skipped (${selectedIds.length - selectedEmailCount}).`
                  : "Emails are sent from your clinic address via Resend."}
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button
                loading={pending}
                disabled={
                  bulkChannel === "whatsapp"
                    ? bulkMode === "broadcast" && !bulkMessage.trim()
                    : bulkMode === "broadcast" &&
                      (!bulkEmailSubject.trim() || !bulkEmailBody.trim())
                }
                onClick={() =>
                  startTransition(async () => {
                    let feedbackText = "";

                    if (bulkChannel === "whatsapp") {
                      const result =
                        bulkMode === "broadcast"
                          ? await sendRetentionBroadcastAction({
                              patientIds: selectedIds,
                              message: bulkMessage,
                            })
                          : await sendBulkRetentionMessagesAction({
                              patientIds: selectedIds,
                              useAi: true,
                              customInstructions: bulkInstructions || undefined,
                            });
                      feedbackText =
                        `Sent ${result.sent} WhatsApp message${result.sent === 1 ? "" : "s"}` +
                        (result.failed ? `, ${result.failed} failed` : "") +
                        (result.simulated ? " (simulated)" : "");
                    } else {
                      const attachments = await filesToEmailAttachments(bulkEmailFiles);
                      const result =
                        bulkMode === "broadcast"
                          ? await sendRetentionEmailBroadcastAction({
                              patientIds: selectedIds,
                              subject: bulkEmailSubject,
                              body: bulkEmailBody,
                              attachments,
                            })
                          : await sendBulkRetentionEmailsAction({
                              patientIds: selectedIds,
                              customInstructions: bulkInstructions || undefined,
                              attachments,
                            });
                      feedbackText =
                        `Sent ${result.sent} email${result.sent === 1 ? "" : "s"}` +
                        (result.failed ? `, ${result.failed} failed` : "");
                    }

                    setBulkOpen(false);
                    resetBulkForm();
                    setFeedback(feedbackText);
                    setSelected(new Set());
                    router.refresh();
                  })
                }
              >
                {bulkMode === "ai" ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Send with AI
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send {bulkChannel === "email" ? "emails" : "broadcast"}
                  </>
                )}
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
