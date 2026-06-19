import { notFound } from "next/navigation";
import { WalkInWizard } from "@/components/portal/walk-in-wizard";
import { getPublicClinicBySlug, getPublicDoctors } from "@/lib/portal/clinic-public";
import { getPortalWalkInStatus } from "@/lib/actions/public-portal";

export default async function PortalWalkInPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) notFound();

  const [doctors, status] = await Promise.all([
    getPublicDoctors(clinic.id),
    getPortalWalkInStatus(clinicSlug),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Walk-in Queue</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Join the live queue now. Pay online and get your token instantly.
      </p>
      <WalkInWizard
        clinic={clinic}
        doctors={doctors}
        defaultFee={clinic.consultation_fee_default}
        initialStatus={status}
      />
    </div>
  );
}
