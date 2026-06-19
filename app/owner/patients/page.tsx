import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getPatients } from "@/lib/actions/patients";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/utils";
import { PatientSearch } from "@/components/patients/patient-search";
import { Users } from "lucide-react";

export default async function OwnerPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireRole(["clinic_owner"]);
  const { q } = await searchParams;
  const patients = await getPatients(profile.clinic_id!, q);

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Search and manage patient records"
        action={
          <Link href="/owner/patients/new">
            <Button>Register Patient</Button>
          </Link>
        }
      />
      <PatientSearch defaultValue={q} basePath="/owner/patients" />
      {patients.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No patients found"
          description="Register your first patient to get started"
          action={
            <Link href="/owner/patients/new">
              <Button>Register Patient</Button>
            </Link>
          }
        />
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.full_name}</TableCell>
              <TableCell>{formatPhone(p.phone)}</TableCell>
              <TableCell className="capitalize">{p.gender ?? "—"}</TableCell>
              <TableCell>
                <Link href={`/owner/patients/${p.id}`}>
                  <Button size="sm" variant="secondary">
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
    </div>
  );
}
