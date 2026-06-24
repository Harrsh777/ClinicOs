import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";

export default async function AdministratorAppointmentsPage() {
  const profile = await requireRole(["administrator"]);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, appointment_date, appointment_time, status, type, patients(full_name, phone), doctors(profiles(full_name))")
    .eq("clinic_id", profile.clinic_id!)
    .eq("appointment_date", today)
    .order("appointment_time");

  return (
    <div>
      <PageHeader title="Today's Appointments" subtitle="Scheduling overview for clinic administrators" />
      <div className="clinic-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(appointments ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[var(--text-muted)] py-8">
                  No appointments scheduled for today
                </TableCell>
              </TableRow>
            ) : (
              appointments!.map((apt) => {
                const doctors = apt.doctors as unknown as
                  | { profiles?: { full_name: string } | { full_name: string }[] }
                  | { profiles?: { full_name: string } | { full_name: string }[] }[]
                  | null;
                const doctorRow = Array.isArray(doctors) ? doctors[0] : doctors;
                const doctorProfile = doctorRow?.profiles;
                const doctorName = Array.isArray(doctorProfile)
                  ? doctorProfile[0]?.full_name
                  : doctorProfile?.full_name;
                const patientRaw = apt.patients as unknown as
                  | { full_name: string; phone: string }
                  | { full_name: string; phone: string }[]
                  | null;
                const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw;
                return (
                  <TableRow key={apt.id}>
                    <TableCell>{apt.appointment_time?.slice(0, 5)}</TableCell>
                    <TableCell>
                      <p>{patient?.full_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{patient?.phone}</p>
                    </TableCell>
                    <TableCell>{doctorName ?? "—"}</TableCell>
                    <TableCell className="capitalize">{apt.type?.replace(/_/g, " ") ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={apt.status} /></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
