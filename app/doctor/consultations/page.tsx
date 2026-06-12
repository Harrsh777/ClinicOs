import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getDoctorConsultations } from "@/lib/actions/consultations";
import { PageHeader } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DoctorConsultationsPage() {
  const profile = await requireRole(["doctor"]);
  const supabase = await createClient();
  const { data: doctor } = await supabase.from("doctors").select("id").eq("profile_id", profile.id).single();
  const consultations = doctor ? await getDoctorConsultations(doctor.id) : [];

  return (
    <div>
      <PageHeader title="Consultations" subtitle="Active and recent consultations" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {consultations.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{(c.patients as { full_name: string })?.full_name}</TableCell>
              <TableCell>{new Date(c.started_at).toLocaleString()}</TableCell>
              <TableCell><StatusBadge status={c.status} /></TableCell>
              <TableCell>
                <Link href={`/doctor/consultations/${c.id}`}>
                  <Button size="sm">{c.status === "in_progress" ? "Continue" : "View"}</Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
