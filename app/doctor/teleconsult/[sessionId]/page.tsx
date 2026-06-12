import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getTeleconsultSession } from "@/lib/actions/teleconsult";
import { PageHeader } from "@/components/ui/card";
import { TeleconsultRoom } from "@/components/teleconsult/teleconsult-room";

export default async function DoctorTeleconsultSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await requireRole(["doctor"]);
  const { sessionId } = await params;
  const session = await getTeleconsultSession(sessionId);
  if (!session) notFound();

  return (
    <div>
      <PageHeader
        title="Video Consultation"
        subtitle={(session.patients as { full_name: string })?.full_name}
      />
      <TeleconsultRoom session={session} role="doctor" />
    </div>
  );
}
