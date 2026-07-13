import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StartConsultationButton } from "@/components/consultations/start-consultation-button";
import { formatPhone } from "@/lib/utils";
import type { Patient } from "@/lib/types/database";

type PatientRow = Patient & {
  last_visit_at?: string | null;
  visit_count?: number;
  is_returning?: boolean;
  doctor_note?: string | null;
  doctor_note_at?: string | null;
  doctor_name?: string | null;
  in_progress_consultation_id?: string | null;
};

interface PatientListTableProps {
  patients: Patient[];
  basePath: string;
  canRegister?: boolean;
  registerHref?: string;
  readOnly?: boolean;
  /** Show latest doctor diagnosis/note column (owner clinical view). */
  showDoctorNotes?: boolean;
  /** Linked doctor id — enables Write Consultation action per row. */
  linkedDoctorId?: string;
}

export function PatientListTable({
  patients,
  basePath,
  canRegister = false,
  registerHref,
  readOnly = false,
  showDoctorNotes = false,
  linkedDoctorId,
}: PatientListTableProps) {
  if (patients.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="No patients found"
        description={canRegister ? "Register your first patient to get started" : "Try a different search term"}
        action={
          canRegister && registerHref ? (
            <Link href={registerHref}>
              <Button>Register Patient</Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Contact</TableHead>
            {showDoctorNotes && <TableHead>Doctor&apos;s note</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Visits</TableHead>
            <TableHead>Last visit</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((p) => {
            const row = p as PatientRow;
            const lastVisit = row.last_visit_at;
            const visitCount = row.visit_count ?? 0;
            const isReturning = row.is_returning;

            return (
              <TableRow key={p.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-50)] text-sm font-semibold text-[var(--brand-700)]">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]">{p.full_name}</p>
                      <p className="font-mono text-xs text-[var(--text-muted)]">{p.patient_code ?? "—"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{formatPhone(p.phone)}</p>
                  {p.gender && (
                    <p className="text-xs capitalize text-[var(--text-muted)]">{p.gender}</p>
                  )}
                </TableCell>
                {showDoctorNotes && (
                  <TableCell className="max-w-[220px]">
                    {row.doctor_note ? (
                      <div>
                        <p className="text-sm line-clamp-2 text-[var(--text-primary)]">{row.doctor_note}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {row.doctor_name ? `Dr. ${row.doctor_name}` : "Doctor"}
                          {row.in_progress_consultation_id ? " · Draft" : ""}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--text-muted)]">—</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  {isReturning ? (
                    <Badge variant="success">Returning</Badge>
                  ) : visitCount > 0 ? (
                    <Badge variant="info">Active</Badge>
                  ) : (
                    <Badge variant="neutral">New</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm tabular-nums">{visitCount}</TableCell>
                <TableCell className="text-sm text-[var(--text-muted)]">
                  {lastVisit ? new Date(lastVisit).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {linkedDoctorId && (
                      <StartConsultationButton
                        patientId={p.id}
                        doctorId={linkedDoctorId}
                        consultationId={row.in_progress_consultation_id}
                        variant="secondary"
                      />
                    )}
                    <Link href={`${basePath}/${p.id}`}>
                      <Button size="sm" variant="ghost">
                        {readOnly ? "View Profile" : "View"}
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
