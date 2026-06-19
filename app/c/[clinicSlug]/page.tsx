import { notFound } from "next/navigation";
import { ClinicLanding } from "@/components/portal/clinic-landing";
import { getPublicClinicBySlug, getPublicDoctors } from "@/lib/portal/clinic-public";

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) notFound();

  const doctors = await getPublicDoctors(clinic.id);

  return <ClinicLanding clinic={clinic} doctors={doctors} />;
}
