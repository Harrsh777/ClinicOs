import { Card, EmptyState } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { ClinicVisitWithAppointment, EmrRecord } from "@/lib/types/clinical";

type TimelineEntry =
  | { kind: "emr"; date: Date; record: EmrRecord }
  | { kind: "visit"; date: Date; visit: ClinicVisitWithAppointment };

function doctorName(
  profiles?: { full_name: string } | { full_name: string }[] | null
) {
  if (!profiles) return undefined;
  return Array.isArray(profiles) ? profiles[0]?.full_name : profiles.full_name;
}

function formatMedicines(prescriptions: unknown[]): string | null {
  const names: string[] = [];
  for (const rx of prescriptions) {
    const items = (rx as { prescription_items?: { medicine_name: string }[] }).prescription_items ?? [];
    for (const item of items) {
      if (item.medicine_name) names.push(item.medicine_name);
    }
  }
  return names.length ? names.join(", ") : null;
}

function EmrRecordCard({ record }: { record: EmrRecord }) {
  const summary = record.summary as {
    symptoms?: string;
    diagnosis?: string;
    clinical_notes?: string;
    advice?: string;
    follow_up_date?: string;
    doctor?: string;
    prescriptions?: unknown[];
    tests?: string[];
  };

  const medicines = formatMedicines(summary.prescriptions ?? []);

  return (
    <Card padding className="!p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="brand">Visit #{record.visit_number}</Badge>
            <span className="text-xs text-[var(--text-muted)]">
              {new Date(record.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          {summary.doctor && (
            <p className="text-sm text-[var(--text-muted)] mt-1">Dr. {summary.doctor}</p>
          )}
        </div>
        <Badge variant="success">Completed</Badge>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {summary.symptoms && (
          <div>
            <dt className="font-medium text-[var(--text-secondary)]">Complaint</dt>
            <dd>{summary.symptoms}</dd>
          </div>
        )}
        {summary.diagnosis && (
          <div>
            <dt className="font-medium text-[var(--text-secondary)]">Diagnosis</dt>
            <dd>{summary.diagnosis}</dd>
          </div>
        )}
        {medicines && (
          <div>
            <dt className="font-medium text-[var(--text-secondary)]">Medicines</dt>
            <dd>{medicines}</dd>
          </div>
        )}
        {summary.advice && (
          <div>
            <dt className="font-medium text-[var(--text-secondary)]">Advice</dt>
            <dd>{summary.advice}</dd>
          </div>
        )}
        {summary.clinical_notes && (
          <div>
            <dt className="font-medium text-[var(--text-secondary)]">Notes</dt>
            <dd>{summary.clinical_notes}</dd>
          </div>
        )}
        {summary.tests && summary.tests.length > 0 && (
          <div>
            <dt className="font-medium text-[var(--text-secondary)]">Tests</dt>
            <dd>{summary.tests.join(", ")}</dd>
          </div>
        )}
        {summary.follow_up_date && (
          <div>
            <dt className="font-medium text-[var(--text-secondary)]">Follow-up</dt>
            <dd>
              {new Date(summary.follow_up_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}

function ClinicVisitCard({ visit }: { visit: ClinicVisitWithAppointment }) {
  const apt = visit.appointments;
  const visitDate = apt?.appointment_date
    ? new Date(`${apt.appointment_date}T${apt.appointment_time ?? "00:00"}`)
    : new Date(visit.created_at);
  const docName = doctorName(apt?.doctors?.profiles);
  const complaint = apt?.booking_symptoms?.trim() || apt?.notes?.trim() || apt?.booking_notes?.trim() || null;

  return (
    <Card padding className="!p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{visit.visit_code}</Badge>
            <span className="text-xs text-[var(--text-muted)]">
              {visitDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {apt?.appointment_time ? ` · ${apt.appointment_time.slice(0, 5)}` : ""}
            </span>
          </div>
          {docName && <p className="text-sm text-[var(--text-muted)] mt-1">Dr. {docName}</p>}
        </div>
        <StatusBadge status={visit.check_in_status} />
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {complaint && (
          <div>
            <dt className="font-medium text-[var(--text-secondary)]">Complaint</dt>
            <dd>{complaint}</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}

function buildTimeline(records: EmrRecord[], clinicVisits: ClinicVisitWithAppointment[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const record of records) {
    entries.push({ kind: "emr", date: new Date(record.created_at), record });
  }

  for (const visit of clinicVisits) {
    const apt = visit.appointments;
    const date = apt?.appointment_date
      ? new Date(`${apt.appointment_date}T${apt.appointment_time ?? "00:00"}`)
      : new Date(visit.created_at);
    entries.push({ kind: "visit", date, visit });
  }

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function EmrTimeline({
  records,
  clinicVisits = [],
}: {
  records: EmrRecord[];
  clinicVisits?: ClinicVisitWithAppointment[];
}) {
  const timeline = buildTimeline(records, clinicVisits);

  if (!timeline.length) {
    return <EmptyState icon={<FileText />} title="No visit history yet" />;
  }

  return (
    <div className="space-y-4">
      {timeline.map((entry) =>
        entry.kind === "emr" ? (
          <EmrRecordCard key={`emr-${entry.record.id}`} record={entry.record} />
        ) : (
          <ClinicVisitCard key={`visit-${entry.visit.id}`} visit={entry.visit} />
        )
      )}
    </div>
  );
}
