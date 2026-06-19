import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DoctorPrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  await requireRole(["doctor"]);
  const { patient: patientId } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("prescriptions")
    .select("*, patients(full_name), prescription_items(count)")
    .order("created_at", { ascending: false })
    .limit(30);

  if (patientId) query = query.eq("patient_id", patientId);

  const { data: prescriptions } = await query;

  return (
    <div>
      <PageHeader title="Prescriptions" subtitle="E-prescription history" />
      {(prescriptions ?? []).length === 0 ? (
        <EmptyState title="No prescriptions" description="Prescriptions are created during consultations" />
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Items</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(prescriptions ?? []).map((rx) => (
            <TableRow key={rx.id}>
              <TableCell>{(rx.patients as { full_name: string })?.full_name}</TableCell>
              <TableCell>{new Date(rx.created_at).toLocaleDateString()}</TableCell>
              <TableCell>{Array.isArray(rx.prescription_items) ? rx.prescription_items.length : "—"}</TableCell>
              <TableCell>
                <Link href={`/print/prescription/${rx.id}`} target="_blank">
                  <Button size="sm" variant="secondary">Print PDF</Button>
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
