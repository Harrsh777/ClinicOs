import { requireRole } from "@/lib/auth/session";
import { getRevenueAnalytics, getRevenueStats } from "@/lib/actions/billing";
import { PageHeader, StatCard } from "@/components/ui/card";
import { IndianRupee, AlertCircle, TrendingUp } from "lucide-react";
import { OwnerAlerts } from "@/components/owner/owner-alerts";
import { RevenueAnalytics } from "@/components/finance/revenue-analytics";

export const dynamic = "force-dynamic";

export default async function OwnerRevenuePage() {
  const profile = await requireRole(["clinic_owner"]);
  const [stats, analytics] = await Promise.all([
    getRevenueStats(profile.clinic_id!),
    getRevenueAnalytics(profile.clinic_id!),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Revenue Dashboard" subtitle="Clinic financial overview" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Revenue" value={`₹${stats.todayRevenue.toFixed(0)}`} trend="+12.5% vs avg" accent="#14B8A6" icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard label="This Month" value={`₹${stats.monthRevenue.toFixed(0)}`} trend="MTD collections" accent="#3B82F6" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Unpaid Invoices" value={stats.unpaidCount} accent="#F59E0B" icon={<AlertCircle className="h-5 w-5" />} />
        <StatCard label="Unpaid Total" value={`₹${stats.unpaidTotal.toFixed(0)}`} accent="#EF4444" icon={<IndianRupee className="h-5 w-5" />} />
      </div>
      <RevenueAnalytics data={analytics} />
      <OwnerAlerts clinicId={profile.clinic_id!} />
    </div>
  );
}
