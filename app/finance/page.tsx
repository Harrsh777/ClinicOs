import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui/card";
import { IndianRupee, TrendingUp, Receipt } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getRevenueStats } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";

export default async function FinanceDashboard() {
  const profile = await requireRole(["finance_manager"]);
  const stats = await getRevenueStats(profile.clinic_id!);

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Billing and revenue overview"
        action={
          <Link href="/finance/billing">
            <Button variant="secondary">All Invoices</Button>
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Today's Revenue" value={`₹${stats.todayRevenue.toFixed(0)}`} icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard label="This Month" value={`₹${stats.monthRevenue.toFixed(0)}`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Unpaid" value={`₹${stats.unpaidTotal.toFixed(0)}`} icon={<Receipt className="h-5 w-5" />} />
      </div>
    </div>
  );
}
