import { notFound } from "next/navigation";
import { getPatientDetail } from "@/lib/actions/patients";
import { PageHeader } from "@/components/ui/card";
import { PatientProfileTabs } from "@/components/patients/patient-profile-tabs";

export default async function DoctorPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPatientDetail(id);
  if (!data.patient) notFound();

  return (
    <div>
      <PageHeader title={data.patient.full_name} subtitle="Patient profile (read-only)" />
      <PatientProfileTabs {...data} canEdit={false} />
    </div>
  );
}
