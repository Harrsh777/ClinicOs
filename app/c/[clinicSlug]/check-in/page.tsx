import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { PublicCheckIn } from "@/components/portal/public-check-in";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";

export default async function PortalCheckInPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) notFound();

  return (
    <PortalShell clinic={clinic}>
      <PublicCheckIn clinic={clinic} />
    </PortalShell>
  );
}
