import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";

export default async function OwnerConsultationsPage() {
  const profile = await requireRole(["clinic_owner"]);
  const supabase = await createClient();
  const { data: consultations } = await supabase
    .from("consultations")
    .select("*, patients(full_name)")
    .eq("clinic_id", profile.clinic_id!)
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader title="Consultations" subtitle="Active and recent consultations across the clinic" />
      {(consultations ?? []).length === 0 ? (
        <EmptyState title="No consultations yet" description="Consultations appear when doctors see patients" />
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(consultations ?? []).map((c) => (
            <TableRow key={c.id}>
              <TableCell>{(c.patients as { full_name: string })?.full_name}</TableCell>
              <TableCell>{new Date(c.started_at).toLocaleString()}</TableCell>
              <TableCell><StatusBadge status={c.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
    </div>
  );
}
