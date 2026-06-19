import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getPatients } from "@/lib/actions/patients";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/utils";
import { PatientSearch } from "@/components/patients/patient-search";
import { Users } from "lucide-react";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireRole(["receptionist"]);
  const { q } = await searchParams;
  const patients = await getPatients(profile.clinic_id!, q);

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Search and manage patient records"
        action={
          <Link href="/receptionist/patients/new">
            <Button>Register Patient</Button>
          </Link>
        }
      />
      <PatientSearch defaultValue={q} />
      <div className="mt-4">
        {patients.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No patients found"
            description="Register your first patient to get started"
            action={
              <Link href="/receptionist/patients/new">
                <Button>Register Patient</Button>
              </Link>
            }
          />
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm text-[var(--text-muted)]">{p.patient_code}</TableCell>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                <TableCell>{formatPhone(p.phone)}</TableCell>
                <TableCell className="text-sm text-[var(--text-muted)]">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Link href={`/receptionist/patients/${p.id}`}>
                    <Button size="sm" variant="secondary">View</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </div>
    </div>
  );
}
