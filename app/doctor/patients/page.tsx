import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getPatients } from "@/lib/actions/patients";
import { PageHeader } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PatientSearch } from "@/components/patients/patient-search";

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
      <form
        action="/doctor/patients"
        className="relative max-w-md"
      >
        <input name="q" defaultValue={q} placeholder="Search..." className="clinic-input" />
      </form>
      <div className="mt-4">
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
                <TableCell>{p.phone}</TableCell>
                <TableCell>
                  <Link href={`/doctor/patients/${p.id}`}>
                    <Button size="sm" variant="secondary">View Profile</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
