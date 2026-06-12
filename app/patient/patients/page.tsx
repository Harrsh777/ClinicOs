import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPatientDetail } from "@/lib/actions/patients";
import { PageHeader } from "@/components/ui/card";
import { PatientProfileTabs } from "@/components/patients/patient-profile-tabs";

export default async function PatientProfilePage() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", profile.id)
    .single();

  if (!patient) notFound();

  const data = await getPatientDetail(patient.id);

  return (
    <div>
      <PageHeader title="My Health Profile" subtitle="View your medical records" />
      <PatientProfileTabs {...data} canEdit={false} />
    </div>
  );
}
