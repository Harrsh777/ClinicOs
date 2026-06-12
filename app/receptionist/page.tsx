import { PageHeader, StatCard } from "@/components/ui/card";
import { Users, Calendar, ListOrdered } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ReceptionistDashboard() {
  const profile = await requireRole(["receptionist"]);
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [patients, appointments, tokens] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", profile.clinic_id!),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", profile.clinic_id!).eq("appointment_date", today),
    supabase.from("queue_sessions").select("current_token").eq("clinic_id", profile.clinic_id!).eq("session_date", today).maybeSingle(),
  ]);

  return (
    <div>
      <PageHeader title="Reception Desk" subtitle="Today's clinic operations at a glance" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered Patients" value={patients.count ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Today's Appointments" value={appointments.count ?? 0} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Current Token" value={`#${tokens.data?.current_token ?? 0}`} icon={<ListOrdered className="h-5 w-5" />} />
      </div>
    </div>
  );
}
