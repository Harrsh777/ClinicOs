import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getAppointments, getDoctors } from "@/lib/actions/appointments";
import { getClinicFeeSetup } from "@/lib/actions/billing";
import { PageHeader } from "@/components/ui/card";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { AppointmentsHub } from "@/components/appointments/appointments-hub";
import { AppointmentsDateFilter } from "@/components/appointments/appointments-date-filter";
import { AppointmentsStats } from "@/components/appointments/appointments-stats";
import { Button } from "@/components/ui/button";
import { ListOrdered } from "lucide-react";

function defaultDateRange() {
  const today = new Date().toISOString().split("T")[0];
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return { from: today, to: end.toISOString().split("T")[0] };
}

export default async function OwnerAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const profile = await requireRole(["clinic_owner"]);
  const { from: fromParam, to: toParam } = await searchParams;
  const defaults = defaultDateRange();
  const from = fromParam ?? defaults.from;
  const to = toParam ?? defaults.to;

  const [appointments, doctors, feeSetup] = await Promise.all([
    getAppointments(profile.clinic_id!, { dateFrom: from, dateTo: to }),
    getDoctors(profile.clinic_id!),
    getClinicFeeSetup(profile.clinic_id!),
  ]);

  return (
    <div className="space-y-2">
      <PageHeader
        title="Appointments"
        subtitle="Register walk-ins quickly or schedule future visits"
        action={
          <Link href="/owner/queue">
            <Button variant="secondary" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Live Queue
            </Button>
          </Link>
        }
      />

      <AppointmentsStats appointments={appointments} />

      <AppointmentsHub doctors={doctors} clinicId={profile.clinic_id!} feeSetup={feeSetup} />

      <AppointmentsDateFilter from={from} to={to} basePath="/owner/appointments" />

      <AppointmentList appointments={appointments} showActions />
    </div>
  );
}
