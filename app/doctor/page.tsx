import { PageHeader, StatCard } from "@/components/ui/card";
import { Calendar, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function DoctorDashboard() {
  const profile = await requireRole(["doctor"]);
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  const appointments = doctor
    ? await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", doctor.id)
        .eq("appointment_date", today)
    : { count: 0 };

  return (
    <div>
      <PageHeader title="Doctor Dashboard" subtitle={`Welcome, ${profile.full_name}`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Today's Appointments" value={appointments.count ?? 0} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Specialization" value={profile.specialization ?? "General"} icon={<Users className="h-5 w-5" />} />
      </div>
    </div>
  );
}
