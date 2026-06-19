import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) notFound();

  return <PortalShell clinic={clinic}>{children}</PortalShell>;
}
