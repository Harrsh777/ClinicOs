import { requireRole } from "@/lib/auth/session";
import { getClinicPrescriptions } from "@/lib/actions/prescriptions";
import { PageHeader } from "@/components/ui/card";
import { PrescriptionListTable } from "@/components/prescriptions/prescription-list-table";

export default async function DoctorPrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const profile = await requireRole(["doctor"]);
  const { patient: patientId } = await searchParams;

  const prescriptions = await getClinicPrescriptions(profile.clinic_id!, {
    patientId,
    limit: 50,
  });

  return (
    <div>
      <PageHeader
        title="Prescriptions"
        subtitle="E-prescription history — create new prescriptions during consultations"
      />
      <PrescriptionListTable
        prescriptions={prescriptions}
        detailBasePath="/doctor/prescriptions"
        showPatientLink={false}
      />
    </div>
  );
}
