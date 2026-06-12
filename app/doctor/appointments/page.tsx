import { requireRole } from "@/lib/auth/session";
import { getAppointments } from "@/lib/actions/appointments";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { AppointmentList } from "@/components/appointments/appointment-list";

export default async function DoctorAppointmentsPage() {
  const profile = await requireRole(["doctor"]);
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  const allAppointments = await getAppointments(profile.clinic_id!);
  const appointments = doctor
    ? allAppointments.filter((a) => a.doctor_id === doctor.id)
    : [];

  return (
    <div>
      <PageHeader title="My Appointments" subtitle="Review and manage your schedule" />
      <AppointmentList appointments={appointments} showActions />
    </div>
  );
}
