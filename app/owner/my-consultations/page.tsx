import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getLinkedDoctor } from "@/lib/auth/linked-doctor";
import { getDoctorConsultations } from "@/lib/actions/consultations";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function OwnerMyConsultationsPage() {
  const profile = await requireRole(["clinic_owner"]);
  const linkedDoctor = await getLinkedDoctor(profile.id);

  if (!linkedDoctor) {
    return (
      <div>
        <PageHeader title="My Consultations" subtitle="Your active and recent consultations" />
        <EmptyState
          title="Clinical access not enabled"
          description="Enable clinical access from Staff Management to write consultations from the owner portal."
        />
        <Link href="/owner/staff">
          <Button variant="secondary" size="sm">Go to Staff Management</Button>
        </Link>
      </div>
    );
  }

  const consultations = await getDoctorConsultations(linkedDoctor.id);

  return (
    <div>
      <PageHeader
        title="My Consultations"
        subtitle="Start from My Queue or continue an in-progress visit"
      />
      {consultations.length === 0 ? (
        <EmptyState
          title="No consultations yet"
          description="Start a consultation from My Queue when a patient is ready"
          action={
            <Link href="/owner/my-queue">
              <Button size="sm">Open My Queue</Button>
            </Link>
          }
        />
      ) : (
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
                  <Link href={`/owner/consultations/${c.id}`}>
                    <Button size="sm">{c.status === "in_progress" ? "Continue" : "View"}</Button>
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
