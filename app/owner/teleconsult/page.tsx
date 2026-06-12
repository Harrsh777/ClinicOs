import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getTeleconsultSessions } from "@/lib/actions/teleconsult";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Video } from "lucide-react";

export default async function OwnerTeleconsultPage() {
  const profile = await requireRole(["clinic_owner"]);
  const sessions = await getTeleconsultSessions(profile.clinic_id!);

  return (
    <div>
      <PageHeader title="Teleconsult Overview" subtitle="All video consultation sessions at your clinic" />

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Video className="h-8 w-8" />}
          title="No teleconsult sessions yet"
          description="Sessions appear when patients book teleconsult appointments."
        />
      ) : (
        <Card padding={false}>
          <table className="clinic-table w-full">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>{(session.patients as { full_name: string })?.full_name}</td>
                  <td>{(session.doctors as { profiles: { full_name: string } })?.profiles?.full_name}</td>
                  <td><StatusBadge status={session.status} /></td>
                  <td className="text-sm text-[var(--text-muted)]">
                    {new Date(session.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
