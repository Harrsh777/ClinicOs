import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StartConsultationButton } from "@/components/consultations/start-consultation-button";
import type { PatientDoctorNote } from "@/lib/actions/patients";

interface PatientConsultationPanelProps {
  patientId: string;
  doctorId: string;
  activeConsultationId?: string | null;
  latestNote?: PatientDoctorNote | null;
}

export function PatientConsultationPanel({
  patientId,
  doctorId,
  activeConsultationId,
  latestNote,
}: PatientConsultationPanelProps) {
  return (
    <Card className="!p-5 mb-6 border-[var(--brand-200)] bg-gradient-to-br from-[var(--brand-50)]/80 to-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-[var(--text-primary)]">Doctor&apos;s consultation</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Document the patient&apos;s problem, diagnosis, and advice. Notes auto-save and appear in the patient list.
          </p>
        </div>
        <StartConsultationButton
          patientId={patientId}
          doctorId={doctorId}
          consultationId={activeConsultationId}
          size="md"
        />
      </div>

      {latestNote?.note && (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-white/90 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Latest doctor&apos;s note
            </span>
            {latestNote.inProgress && <Badge variant="info">In progress</Badge>}
            {latestNote.doctorName && (
              <span className="text-xs text-[var(--text-muted)]">· Dr. {latestNote.doctorName}</span>
            )}
            <span className="text-xs text-[var(--text-muted)]">
              · {new Date(latestNote.notedAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-[var(--text-primary)]">{latestNote.note}</p>
          {latestNote.consultationId && (
            <Link
              href={`/owner/consultations/${latestNote.consultationId}`}
              className="mt-2 inline-block text-xs font-medium text-[var(--brand-600)] hover:underline"
            >
              {latestNote.inProgress ? "Open consultation to edit →" : "View consultation →"}
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
