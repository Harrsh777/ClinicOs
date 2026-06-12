import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getDoctors, getAppointments } from "@/lib/actions/appointments";
import { PageHeader } from "@/components/ui/card";
import { BookAppointmentForm } from "@/components/appointments/book-appointment-form";
import { AppointmentList } from "@/components/appointments/appointment-list";

export default async function PatientAppointmentsPage() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, clinic_id")
    .eq("user_id", profile.id)
    .single();

  if (!patient) {
    return (
      <div className="clinic-card p-6 text-center text-[var(--text-muted)]">
        Patient record not linked to your account.
      </div>
    );
  }

  const [doctors, appointments] = await Promise.all([
    getDoctors(patient.clinic_id),
    getAppointments(patient.clinic_id),
  ]);

  const myAppointments = appointments.filter((a) => a.patient_id === patient.id);

  return (
    <div>
      <PageHeader title="My Appointments" subtitle="Book and track your visits" />
      <BookAppointmentForm doctors={doctors} patientId={patient.id} />
      <div className="mt-8">
        <h3 className="font-semibold mb-4">Your Appointments</h3>
        <AppointmentList appointments={myAppointments} showActions={false} />
      </div>
    </div>
  );
}
