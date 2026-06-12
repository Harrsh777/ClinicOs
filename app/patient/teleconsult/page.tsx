import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getTeleconsultSessions } from "@/lib/actions/teleconsult";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Video } from "lucide-react";

export default async function PatientTeleconsultPage() {
  await requireRole(["patient"]);
  const sessions = await getTeleconsultSessions();

  const active = sessions.filter((s) => ["scheduled", "waiting", "in_progress"].includes(s.status));

  return (
    <div>
      <PageHeader title="Teleconsult" subtitle="Join your video appointments" />

      {active.length === 0 ? (
        <EmptyState
          icon={<Video className="h-8 w-8" />}
          title="No upcoming video calls"
          description="Book a teleconsult appointment from the appointments page."
          action={
            <Link href="/patient/appointments">
              <Button>Book Appointment</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((session) => (
            <Card key={session.id} hover>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">
                  Dr. {(session.doctors as { profiles: { full_name: string } })?.profiles?.full_name ?? "—"}
                </p>
                <StatusBadge status={session.status} />
              </div>
              <Link href={`/patient/teleconsult/${session.id}`}>
                <Button className="w-full gap-2" variant={session.status === "in_progress" ? "primary" : "secondary"}>
                  <Video className="h-4 w-4" />
                  {session.status === "waiting" ? "Waiting Room" : "Join Call"}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
