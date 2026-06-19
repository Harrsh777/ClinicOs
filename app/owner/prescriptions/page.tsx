import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default async function OwnerPrescriptionsPage() {
  const profile = await requireRole(["clinic_owner"]);
  const supabase = await createClient();
  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("*, patients(full_name)")
    .eq("clinic_id", profile.clinic_id!)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader title="Prescriptions" subtitle="E-prescriptions issued at your clinic" />
      {(prescriptions ?? []).length === 0 ? (
        <EmptyState title="No prescriptions issued" />
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(prescriptions ?? []).map((rx) => (
            <TableRow key={rx.id}>
              <TableCell>{(rx.patients as { full_name: string })?.full_name}</TableCell>
              <TableCell>{new Date(rx.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="capitalize">{rx.status}</TableCell>
              <TableCell>
                <Link href={`/print/prescription/${rx.id}`} target="_blank">
                  <Button size="sm" variant="secondary">Print</Button>
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
