import { Card, StatCard } from "@/components/ui/card";
import { EmrTimeline } from "@/components/patients/emr-timeline";
import type { EmrRecord } from "@/lib/types/clinical";

interface PatientSummaryPanelProps {
  summary: {
    patient: {
      patient_code: string | null;
      is_returning?: boolean;
      visit_count?: number;
      last_visit_at?: string | null;
      next_appointment_at?: string | null;
    };
    appointments: Array<{
      id: string;
      appointment_date: string;
      appointment_time: string;
      status: string;
      consultation_type?: string;
      appointment_number?: string | null;
      booking_symptoms?: string | null;
      booking_notes?: string | null;
      doctors?: { profiles?: { full_name: string } | { full_name: string }[] } | null;
    }>;
    prescriptions: Array<{ id: string; created_at: string; doctors?: { profiles?: { full_name: string } | { full_name: string }[] } | null }>;
    emrRecords: EmrRecord[];
    bills: Array<{ id: string; invoice_number: string; total_amount: number; paid_amount: number; status: string; created_at: string }>;
    documents: Array<{ id: string; name: string; document_type: string; created_at: string }>;
  };
}

export function PatientSummaryPanel({ summary }: PatientSummaryPanelProps) {
  const { patient, appointments, prescriptions, emrRecords, bills, documents } = summary;

  return (
    <div className="mb-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Patient ID" value={patient.patient_code ?? "—"} />
        <StatCard label="Total visits" value={String(patient.visit_count ?? 0)} />
        <StatCard
          label="Status"
          value={patient.is_returning ? "Returning" : "New"}
        />
        <StatCard
          label="Last visit"
          value={patient.last_visit_at ? new Date(patient.last_visit_at).toLocaleDateString() : "—"}
        />
      </div>

      {patient.next_appointment_at && (
        <Card className="!p-4 border-[var(--brand-200)] bg-[var(--brand-50)]">
          <p className="text-sm font-medium text-[var(--brand-700)]">
            Next appointment: {new Date(patient.next_appointment_at).toLocaleString()}
          </p>
        </Card>
      )}

      {appointments.length > 0 && (
        <Card className="!p-4">
          <h3 className="mb-3 font-semibold">Recent Appointments</h3>
          <ul className="space-y-2 text-sm">
            {appointments.map((a) => {
              const doc = a.doctors?.profiles;
              const docName = Array.isArray(doc) ? doc[0]?.full_name : doc?.full_name;
              return (
                <li key={a.id} className="border-b border-[var(--border)] pb-3 last:border-0">
                  <div className="flex justify-between">
                    <span>
                      {a.appointment_date} {a.appointment_time?.slice(0, 5)}
                      {docName ? ` · ${docName}` : ""}
                      {a.appointment_number ? ` · ${a.appointment_number}` : ""}
                    </span>
                    <span className="capitalize text-[var(--text-muted)]">{a.status}</span>
                  </div>
                  {a.booking_symptoms && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      <span className="font-medium">Symptoms:</span> {a.booking_symptoms}
                    </p>
                  )}
                  {a.booking_notes && (
                    <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-2">{a.booking_notes}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {emrRecords.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">Visit Timeline</h3>
          <EmrTimeline records={emrRecords} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {prescriptions.length > 0 && (
          <Card className="!p-4">
            <h3 className="mb-3 font-semibold">Prescriptions</h3>
            <ul className="space-y-1 text-sm">
              {prescriptions.map((rx) => (
                <li key={rx.id}>{new Date(rx.created_at).toLocaleDateString()} — Prescription</li>
              ))}
            </ul>
          </Card>
        )}
        {bills.length > 0 && (
          <Card className="!p-4">
            <h3 className="mb-3 font-semibold">Payment History</h3>
            <ul className="space-y-1 text-sm">
              {bills.map((b) => (
                <li key={b.id} className="flex justify-between">
                  <span>{b.invoice_number}</span>
                  <span>₹{b.paid_amount}/{b.total_amount} · {b.status}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {documents.length > 0 && (
          <Card className="!p-4 lg:col-span-2">
            <h3 className="mb-3 font-semibold">Uploaded Reports</h3>
            <ul className="space-y-1 text-sm">
              {documents.map((d) => (
                <li key={d.id}>{d.name} <span className="text-[var(--text-muted)]">({d.document_type})</span></li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
