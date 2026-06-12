import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getTeleconsultSessions } from "@/lib/actions/teleconsult";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

export default async function DoctorTeleconsultPage() {
  const profile = await requireRole(["doctor"]);
  const sessions = await getTeleconsultSessions(profile.clinic_id ?? undefined);

  const upcoming = sessions.filter((s) => ["scheduled", "waiting", "in_progress"].includes(s.status));
  const past = sessions.filter((s) => ["completed", "cancelled", "no_show"].includes(s.status));

  return (
    <div>
      <PageHeader title="Teleconsult" subtitle="Video consultations with your patients" />

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          icon={<Video className="h-8 w-8" />}
          title="No teleconsult sessions"
          description="Sessions are created when patients book teleconsult appointments."
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wide">Upcoming & Active</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((session) => (
                  <Card key={session.id} hover>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{(session.patients as { full_name: string })?.full_name}</p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {(session.doctors as { profiles: { full_name: string } })?.profiles?.full_name}
                        </p>
                      </div>
                      <StatusBadge status={session.status} />
                    </div>
                    <Link href={`/doctor/teleconsult/${session.id}`}>
                      <Button className="w-full gap-2">
                        <Video className="h-4 w-4" />
                        {session.status === "in_progress" ? "Join Call" : "Start Video Call"}
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wide">Past Sessions</h3>
              <div className="space-y-2">
                {past.slice(0, 10).map((session) => (
                  <div key={session.id} className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                    <span>{(session.patients as { full_name: string })?.full_name}</span>
                    <Badge variant="neutral">{session.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
