import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui/card";
import { IndianRupee, TrendingUp, Receipt } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getRevenueAnalytics, getRevenueStats } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";
import { RevenueAnalytics } from "@/components/finance/revenue-analytics";

export const dynamic = "force-dynamic";

export default async function FinanceDashboard() {
  const profile = await requireRole(["finance_manager"]);
  const [stats, analytics] = await Promise.all([
    getRevenueStats(profile.clinic_id!),
    getRevenueAnalytics(profile.clinic_id!),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Finance Command Center"
        subtitle="Revenue, invoices, collections, and payment health"
        action={
          <Link href="/finance/billing">
            <Button variant="secondary">All Invoices</Button>
          </Link>
        }
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Revenue" value={`₹${stats.todayRevenue.toFixed(0)}`} trend="Daily collection" accent="#14B8A6" icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard label="This Month" value={`₹${stats.monthRevenue.toFixed(0)}`} trend="MTD revenue" accent="#3B82F6" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Unpaid Invoices" value={stats.unpaidCount} accent="#F59E0B" icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Unpaid Total" value={`₹${stats.unpaidTotal.toFixed(0)}`} accent="#EF4444" icon={<IndianRupee className="h-5 w-5" />} />
      </div>
      <RevenueAnalytics data={analytics} />
    </div>
  );
}
