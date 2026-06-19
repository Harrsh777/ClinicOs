import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui/card";
import { ListOrdered, Users, Calendar, UserCheck, Clock, IndianRupee, Receipt } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getReceptionistDashboard } from "@/lib/actions/role-dashboards";
import { Button } from "@/components/ui/button";

export default async function ReceptionistDashboard() {
  const profile = await requireRole(["receptionist"]);
  const stats = await getReceptionistDashboard(profile.clinic_id!);

  return (
    <div>
      <PageHeader title="Reception Dashboard" subtitle="Today's clinic operations at a glance" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current Token" value={stats.currentToken} icon={<ListOrdered className="h-5 w-5" />} />
        <StatCard label="Waiting" value={stats.waiting} icon={<Users className="h-5 w-5" />} trend="Patients in queue" />
        <StatCard label="Arrived" value={stats.arrived} icon={<UserCheck className="h-5 w-5" />} trend="Called or serving" />
        <StatCard label="Upcoming" value={stats.upcoming} icon={<Calendar className="h-5 w-5" />} trend="Scheduled today" />
        <StatCard label="Walk-ins" value={stats.walkIns} icon={<Clock className="h-5 w-5" />} />
        <StatCard
          label="Revenue Today"
          value={`₹${stats.revenueToday.toLocaleString("en-IN")}`}
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <StatCard label="Unpaid Bills" value={stats.unpaidBills} icon={<Receipt className="h-5 w-5" />} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/receptionist/queue">
          <Button className="gap-2">
            <UserCheck className="h-4 w-4" />
            Check In Patient
          </Button>
        </Link>
        <Link href="/receptionist/queue">
          <Button variant="secondary" className="gap-2">
            <ListOrdered className="h-4 w-4" />
            Generate Token
          </Button>
        </Link>
        <Link href="/receptionist/billing">
          <Button variant="secondary" className="gap-2">
            <IndianRupee className="h-4 w-4" />
            Take Payment
          </Button>
        </Link>
        <Link href="/receptionist/billing">
          <Button variant="secondary" className="gap-2">
            <Receipt className="h-4 w-4" />
            Print Receipt
          </Button>
        </Link>
      </div>
    </div>
  );
}
