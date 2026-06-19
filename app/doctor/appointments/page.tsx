import { requireRole } from "@/lib/auth/session";
import { getAppointments } from "@/lib/actions/appointments";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { AppointmentsDateFilter } from "@/components/appointments/appointments-date-filter";

function defaultDateRange() {
  const today = new Date().toISOString().split("T")[0];
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return { from: today, to: end.toISOString().split("T")[0] };
}

export default async function DoctorAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const profile = await requireRole(["doctor"]);
  const { from: fromParam, to: toParam } = await searchParams;
  const defaults = defaultDateRange();
  const from = fromParam ?? defaults.from;
  const to = toParam ?? defaults.to;

  const supabase = await createClient();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  const appointments = doctor
    ? await getAppointments(profile.clinic_id!, { dateFrom: from, dateTo: to, doctorId: doctor.id })
    : [];

  return (
    <div>
      <PageHeader title="My Appointments" subtitle="Your schedule" />
      <AppointmentsDateFilter from={from} to={to} basePath="/doctor/appointments" />
      <AppointmentList appointments={appointments} showActions={false} />
    </div>
  );
}
