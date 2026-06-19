import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getPatients } from "@/lib/actions/patients";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PatientSearch } from "@/components/patients/patient-search";
import { formatPhone } from "@/lib/utils";
import { Users } from "lucide-react";

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireRole(["doctor"]);
  const { q } = await searchParams;
  const patients = await getPatients(profile.clinic_id!, q);

  return (
    <div>
      <PageHeader title="Patients" subtitle="Search and view patient records (read-only)" />
      <div className="mt-4">
        <PatientSearch defaultValue={q} basePath="/doctor/patients" />
      </div>
      <div className="mt-4">
        {patients.length === 0 ? (
          <EmptyState icon={<Users />} title="No patients found" description="Try a different search term" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>{formatPhone(p.phone)}</TableCell>
                  <TableCell>
                    <Link href={`/doctor/patients/${p.id}`}>
                      <Button size="sm" variant="secondary">View Profile</Button>
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
