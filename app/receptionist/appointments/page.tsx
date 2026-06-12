import { requireRole } from "@/lib/auth/session";
import { getAppointments, getDoctors } from "@/lib/actions/appointments";
import { getPatients } from "@/lib/actions/patients";
import { PageHeader } from "@/components/ui/card";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { BookAppointmentForm } from "@/components/appointments/book-appointment-form";

export default async function ReceptionistAppointmentsPage() {
  const profile = await requireRole(["receptionist"]);
  const today = new Date().toISOString().split("T")[0];
  const [appointments, doctors, patients] = await Promise.all([
    getAppointments(profile.clinic_id!, { date: today }),
    getDoctors(profile.clinic_id!),
    getPatients(profile.clinic_id!),
  ]);

  return (
    <div>
      <PageHeader title="Appointments" subtitle="Today's schedule and walk-in bookings" />
      <BookAppointmentForm doctors={doctors} patients={patients} isStaff />
      <div className="mt-8">
        <AppointmentList appointments={appointments} showActions={false} />
      </div>
    </div>
  );
}
