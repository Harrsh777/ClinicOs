import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getTeleconsultSession } from "@/lib/actions/teleconsult";
import { PageHeader } from "@/components/ui/card";
import { TeleconsultRoom } from "@/components/teleconsult/teleconsult-room";

export default async function PatientTeleconsultSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await requireRole(["patient"]);
  const { sessionId } = await params;
  const session = await getTeleconsultSession(sessionId);
  if (!session) notFound();

  return (
    <div>
      <PageHeader title="Video Consultation" subtitle="Your teleconsult session" />
      <TeleconsultRoom session={session} role="patient" />
    </div>
  );
}
