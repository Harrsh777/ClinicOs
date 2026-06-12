import { Card, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { EmrRecord } from "@/lib/types/clinical";

export function EmrTimeline({ records }: { records: EmrRecord[] }) {
  if (!records.length) {
    return <EmptyState icon={<FileText />} title="No visit history yet" />;
  }

  return (
    <div className="space-y-4">
      {records.map((record) => {
        const summary = record.summary as {
          symptoms?: string;
          diagnosis?: string;
          clinical_notes?: string;
          doctor?: string;
          prescriptions?: unknown[];
        };
        return (
          <Card key={record.id} padding className="!p-5">
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
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {summary.symptoms && (
                <div>
                  <dt className="font-medium text-[var(--text-secondary)]">Symptoms</dt>
                  <dd>{summary.symptoms}</dd>
                </div>
              )}
              {summary.diagnosis && (
                <div>
                  <dt className="font-medium text-[var(--text-secondary)]">Diagnosis</dt>
                  <dd>{summary.diagnosis}</dd>
                </div>
              )}
              {summary.clinical_notes && (
                <div>
                  <dt className="font-medium text-[var(--text-secondary)]">Notes</dt>
                  <dd>{summary.clinical_notes}</dd>
                </div>
              )}
            </dl>
            {record.addendum && (
              <p className="mt-3 text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
                Addendum: {record.addendum}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
