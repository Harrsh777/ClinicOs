import { requireRole } from "@/lib/auth/session";
import { getRevenueStats } from "@/lib/actions/billing";
import { PageHeader, StatCard, Card } from "@/components/ui/card";
import { IndianRupee, AlertCircle, TrendingUp } from "lucide-react";
import { OwnerAlerts } from "@/components/owner/owner-alerts";

export default async function OwnerRevenuePage() {
  const profile = await requireRole(["clinic_owner"]);
  const stats = await getRevenueStats(profile.clinic_id!);

  return (
    <div>
      <PageHeader title="Revenue Dashboard" subtitle="Clinic financial overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Today's Revenue" value={`₹${stats.todayRevenue.toFixed(0)}`} icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard label="This Month" value={`₹${stats.monthRevenue.toFixed(0)}`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Unpaid Invoices" value={stats.unpaidCount} icon={<AlertCircle className="h-5 w-5" />} />
        <StatCard label="Unpaid Total" value={`₹${stats.unpaidTotal.toFixed(0)}`} icon={<IndianRupee className="h-5 w-5" />} />
      </div>
      <OwnerAlerts clinicId={profile.clinic_id!} />
    </div>
  );
}
