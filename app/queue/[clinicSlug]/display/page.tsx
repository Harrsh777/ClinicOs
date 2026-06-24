import { notFound } from "next/navigation";
import { getQueueBySlug } from "@/lib/actions/queue";
import { TVDisplay } from "@/components/queue/tv-display";

export default async function TVDisplayPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const data = await getQueueBySlug(clinicSlug);
  if (!data) notFound();

  return (
    <TVDisplay
      clinic={data.clinic}
      initialSession={data.session}
      initialTokens={data.tokens as never}
      initialServing={(data.serving ?? null) as never}
      initialNextTokens={data.nextTokens as never}
      initialEstimatedWait={data.estimatedWaitMins}
    />
  );
}
