import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getLinkedDoctor } from "@/lib/auth/linked-doctor";
import { createClient } from "@/lib/supabase/server";
import { getDoctorConsultations } from "@/lib/actions/consultations";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function OwnerConsultationsPage() {
  const profile = await requireRole(["clinic_owner"]);
  const supabase = await createClient();
  const linkedDoctor = await getLinkedDoctor(profile.id);

  const [{ data: consultations }, myConsultations] = await Promise.all([
    supabase
      .from("consultations")
      .select("*, patients(full_name), doctors(profiles(full_name))")
      .eq("clinic_id", profile.clinic_id!)
      .order("started_at", { ascending: false })
      .limit(50),
    linkedDoctor ? getDoctorConsultations(linkedDoctor.id) : Promise.resolve([]),
  ]);

  const inProgressMine = myConsultations.filter((c) => c.status === "in_progress");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Consultations"
        subtitle="Clinic-wide consultation history and your active visits"
      />

      {linkedDoctor && inProgressMine.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Your active consultations</h2>
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
              {inProgressMine.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{(c.patients as { full_name: string })?.full_name}</TableCell>
                  <TableCell>{new Date(c.started_at).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    <Link href={`/owner/consultations/${c.id}`}>
                      <Button size="sm">Continue</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {linkedDoctor && (
        <div className="flex flex-wrap gap-2">
          <Link href="/owner/my-queue">
            <Button size="sm">My Queue</Button>
          </Link>
          <Link href="/owner/my-consultations">
            <Button size="sm" variant="secondary">My Consultations</Button>
          </Link>
          <Link href="/owner/ai-doctor">
            <Button size="sm" variant="secondary">AI Doctor</Button>
          </Link>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">All clinic consultations</h2>
        {(consultations ?? []).length === 0 ? (
          <EmptyState title="No consultations yet" description="Consultations appear when doctors see patients" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(consultations ?? []).map((c) => {
                const doctorProfile = (c.doctors as { profiles?: { full_name: string } | { full_name: string }[] })?.profiles;
                const doctorName = Array.isArray(doctorProfile)
                  ? doctorProfile[0]?.full_name
                  : doctorProfile?.full_name;
                const isMine = linkedDoctor && c.doctor_id === linkedDoctor.id;

                return (
                  <TableRow key={c.id}>
                    <TableCell>{(c.patients as { full_name: string })?.full_name}</TableCell>
                    <TableCell>{doctorName ?? "—"}</TableCell>
                    <TableCell>{new Date(c.started_at).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      {isMine ? (
                        <Link href={`/owner/consultations/${c.id}`}>
                          <Button size="sm" variant="ghost">
                            {c.status === "in_progress" ? "Continue" : "View"}
                          </Button>
                        </Link>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
