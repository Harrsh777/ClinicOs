import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatPhone } from "@/lib/utils";
import type { Patient } from "@/lib/types/database";

interface PatientListTableProps {
  patients: Patient[];
  basePath: string;
  canRegister?: boolean;
  registerHref?: string;
  readOnly?: boolean;
}

export function PatientListTable({
  patients,
  basePath,
  canRegister = false,
  registerHref,
  readOnly = false,
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
            <TableHead>Status</TableHead>
            <TableHead>Visits</TableHead>
            <TableHead>Last visit</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((p) => {
            const lastVisit = (p as Patient & { last_visit_at?: string | null }).last_visit_at;
            const visitCount = (p as Patient & { visit_count?: number }).visit_count ?? 0;
            const isReturning = (p as Patient & { is_returning?: boolean }).is_returning;

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
                  <Link href={`${basePath}/${p.id}`}>
                    <Button size="sm" variant="secondary">
                      {readOnly ? "View Profile" : "View"}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
