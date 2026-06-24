import { StatCard } from "@/components/ui/card";
import { Calendar, Clock, UserPlus, AlertCircle } from "lucide-react";

interface AppointmentRow {
  appointment_date: string;
  status: string;
  type: string;
}

export function AppointmentsStats({ appointments }: { appointments: AppointmentRow[] }) {
  const today = new Date().toISOString().split("T")[0];
  const todayAppts = appointments.filter((a) => a.appointment_date === today);
  const pending = appointments.filter((a) => a.status === "pending");
  const walkIns = appointments.filter((a) => a.type === "walk_in" || a.type === "emergency");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      <StatCard
        label="Today"
        value={todayAppts.length}
        icon={<Calendar className="h-5 w-5 text-[var(--brand-500)]" />}
        accent="#14B8A6"
      />
      <StatCard
        label="Pending approval"
        value={pending.length}
        icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
        accent="#F59E0B"
      />
      <StatCard
        label="Walk-ins / emergency"
        value={walkIns.length}
        icon={<UserPlus className="h-5 w-5 text-violet-500" />}
        accent="#8B5CF6"
      />
      <StatCard
        label="In date range"
        value={appointments.length}
        icon={<Clock className="h-5 w-5 text-sky-500" />}
        accent="#0EA5E9"
      />
    </div>
  );
}
