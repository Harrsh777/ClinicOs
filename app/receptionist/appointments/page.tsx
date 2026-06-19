import { requireRole } from "@/lib/auth/session";
import { getAppointments, getDoctors } from "@/lib/actions/appointments";
import { PageHeader } from "@/components/ui/card";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { BookAppointmentForm } from "@/components/appointments/book-appointment-form";
import { AppointmentsDateFilter } from "@/components/appointments/appointments-date-filter";

function defaultDateRange() {
  const today = new Date().toISOString().split("T")[0];
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return { from: today, to: end.toISOString().split("T")[0] };
}

export default async function ReceptionistAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const profile = await requireRole(["receptionist"]);
  const { from: fromParam, to: toParam } = await searchParams;
  const defaults = defaultDateRange();
  const from = fromParam ?? defaults.from;
  const to = toParam ?? defaults.to;

  const [appointments, doctors] = await Promise.all([
    getAppointments(profile.clinic_id!, { dateFrom: from, dateTo: to }),
    getDoctors(profile.clinic_id!),
  ]);

  return (
    <div>
      <PageHeader title="Appointments" subtitle="Schedule and manage bookings" />
      <BookAppointmentForm doctors={doctors} clinicId={profile.clinic_id!} isStaff />
      <AppointmentsDateFilter from={from} to={to} basePath="/receptionist/appointments" />
      <AppointmentList appointments={appointments} showActions />
    </div>
  );
}
