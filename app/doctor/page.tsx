import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui/card";
import { Calendar, Users, ListOrdered, FlaskConical, Heart, Stethoscope, Pill, Video } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getDoctorDashboard } from "@/lib/actions/role-dashboards";
import { Button } from "@/components/ui/button";

export default async function DoctorDashboard() {
  const profile = await requireRole(["doctor"]);
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  const stats = await getDoctorDashboard(profile.clinic_id!, doctor?.id ?? null);

  return (
    <div>
      <PageHeader title="Doctor Dashboard" subtitle={`Welcome, ${profile.full_name}`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Today's Patients" value={stats.todayPatients} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Current Patient" value={stats.currentPatient} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Next Patient" value={stats.nextPatient} icon={<ListOrdered className="h-5 w-5" />} />
        <StatCard label="Pending Reports" value={stats.pendingReports} icon={<FlaskConical className="h-5 w-5" />} />
        <StatCard label="Follow-ups" value={stats.followUps} icon={<Heart className="h-5 w-5" />} />
        <StatCard label="Specialization" value={profile.specialization ?? "General"} icon={<Stethoscope className="h-5 w-5" />} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={stats.activeConsultationId ? `/doctor/consultations/${stats.activeConsultationId}` : "/doctor/consultations"}>
          <Button className="gap-2">
            <Stethoscope className="h-4 w-4" />
            Open Consultation
          </Button>
        </Link>
        <Link href={stats.activeConsultationId ? `/doctor/consultations/${stats.activeConsultationId}` : "/doctor/consultations"}>
          <Button variant="secondary" className="gap-2">
            <Pill className="h-4 w-4" />
            Write Prescription
          </Button>
        </Link>
        <Link href={stats.activeConsultationId ? `/doctor/consultations/${stats.activeConsultationId}` : "/doctor/consultations"}>
          <Button variant="secondary" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Order Lab Test
          </Button>
        </Link>
        <Link href="/doctor/teleconsult">
          <Button variant="secondary" className="gap-2">
            <Video className="h-4 w-4" />
            Start Teleconsultation
          </Button>
        </Link>
      </div>
    </div>
  );
}
