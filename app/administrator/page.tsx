import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard } from "@/components/ui/card";
import { Calendar, Users, ListOrdered, Receipt } from "lucide-react";

export default async function AdministratorDashboardPage() {
  const profile = await requireRole(["administrator"]);
  const supabase = await createClient();
  const clinicId = profile.clinic_id!;

  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: staffCount },
    { count: patientCount },
    { count: todayAppointments },
    { count: queueActive },
    { count: unpaidBills },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).neq("role", "patient"),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("appointment_date", today),
    supabase.from("queue_tokens").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).in("status", ["waiting", "called"]),
    supabase.from("bills").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).neq("status", "paid"),
  ]);

  return (
    <div>
      <PageHeader title="Administration" subtitle="Clinic operations overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Staff Members" value={staffCount ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Registered Patients" value={patientCount ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Today's Appointments" value={todayAppointments ?? 0} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="In Queue Now" value={queueActive ?? 0} icon={<ListOrdered className="h-5 w-5" />} />
        <StatCard label="Unpaid Bills" value={unpaidBills ?? 0} icon={<Receipt className="h-5 w-5" />} />
      </div>
    </div>
  );
}
