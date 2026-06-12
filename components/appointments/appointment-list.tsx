import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { formatTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface AppointmentRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  type: string;
  priority: string;
  patients?: { full_name: string; phone: string };
  doctors?: { profiles?: { full_name: string } };
}

export function AppointmentList({
  appointments,
  showActions = true,
}: {
  appointments: AppointmentRow[];
  showActions?: boolean;
}) {
  if (!appointments.length) {
    return <EmptyState icon={<Calendar />} title="No appointments" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Doctor</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {appointments.map((a) => (
          <TableRow key={a.id}>
            <TableCell>{new Date(a.appointment_date).toLocaleDateString()}</TableCell>
            <TableCell>{formatTime(a.appointment_time)}</TableCell>
            <TableCell>{a.patients?.full_name ?? "—"}</TableCell>
            <TableCell>{a.doctors?.profiles?.full_name ?? "—"}</TableCell>
            <TableCell className="capitalize">{a.type.replace(/_/g, " ")}</TableCell>
            <TableCell><StatusBadge status={a.status} /></TableCell>
            {showActions && (
              <TableCell>
                <AppointmentActions appointmentId={a.id} status={a.status} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
