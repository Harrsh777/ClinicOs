import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard } from "@/components/ui/card";
import { PatientQueueView } from "@/components/queue/patient-queue-view";
import { VisitTokenCard } from "@/components/patient/visit-token-card";
import { getPatientActiveVisit } from "@/lib/actions/visits";
import { getPatientDashboardSummary } from "@/lib/actions/role-dashboards";
import { Calendar, FileHeart, Pill, FlaskConical, Receipt, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PatientDashboard() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, clinic_id")
    .eq("user_id", profile.id)
    .maybeSingle();

  const activeVisit = patient ? await getPatientActiveVisit(patient.id).catch(() => null) : null;
  const summary = patient ? await getPatientDashboardSummary(patient.id) : null;

  const upcomingLabel = summary?.upcomingAppointment
    ? `${summary.upcomingAppointment.appointment_date} ${summary.upcomingAppointment.appointment_time?.slice(0, 5) ?? ""}`
    : "None scheduled";

  return (
    <div>
      <PageHeader title={`Hello, ${profile.full_name}`} subtitle="Your health dashboard" />
      {patient ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Upcoming Appointment" value={upcomingLabel} icon={<Calendar className="h-5 w-5" />} />
            <StatCard label="Prescriptions" value={summary?.prescriptionCount ?? 0} icon={<Pill className="h-5 w-5" />} />
            <StatCard label="Lab Reports" value={summary?.labReportCount ?? 0} icon={<FlaskConical className="h-5 w-5" />} />
            <StatCard label="Unpaid Invoices" value={summary?.unpaidInvoices ?? 0} icon={<Receipt className="h-5 w-5" />} />
          </div>

          {activeVisit && <VisitTokenCard visit={activeVisit} />}
          <PatientQueueView patientId={patient.id} clinicId={patient.clinic_id} />

          <div className="flex flex-wrap gap-3">
            <Link href="/patient/patients">
              <Button variant="secondary" className="gap-2">
                <FileHeart className="h-4 w-4" />
                Medical Records
              </Button>
            </Link>
            <Link href="/patient/prescriptions">
              <Button variant="secondary" className="gap-2">
                <Pill className="h-4 w-4" />
                Prescriptions
              </Button>
            </Link>
            <Link href="/patient/lab">
              <Button variant="secondary" className="gap-2">
                <FlaskConical className="h-4 w-4" />
                Lab Reports
              </Button>
            </Link>
            <Link href="/patient/billing">
              <Button variant="secondary" className="gap-2">
                <IndianRupee className="h-4 w-4" />
                Invoices & Payments
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="clinic-card p-6 text-center text-[var(--text-muted)]">
          <p>Your patient profile is being set up. Contact your clinic if this persists.</p>
        </div>
      )}
    </div>
  );
}
