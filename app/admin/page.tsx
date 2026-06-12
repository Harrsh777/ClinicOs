import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui/card";
import { Building2, Users, CreditCard, BarChart3, Sparkles } from "lucide-react";
import { getClinics } from "@/lib/actions/admin";
import { getPlatformAnalytics } from "@/lib/actions/platform-admin";
import { Button } from "@/components/ui/button";
import { PlatformAnalytics } from "@/components/admin/platform-analytics";

export default async function AdminDashboard() {
  const [clinics, analytics] = await Promise.all([getClinics(), getPlatformAnalytics()]);
  const active = clinics.filter((c) => c.status === "active").length;
  const trial = clinics.filter((c) => c.status === "trial").length;

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        subtitle="ClinicOS super admin overview"
        action={
          <div className="flex gap-2">
            <Link href="/admin/analytics"><Button variant="secondary" size="sm" className="gap-2"><BarChart3 className="h-4 w-4" />Analytics</Button></Link>
            <Link href="/admin/clinics"><Button size="sm">Manage Clinics</Button></Link>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Clinics" value={clinics.length} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Active" value={active} icon={<Users className="h-5 w-5" />} />
        <StatCard label="On Trial" value={trial} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard label="MRR" value={`₹${analytics.mrr.toLocaleString("en-IN")}`} icon={<Sparkles className="h-5 w-5" />} />
      </div>
      <PlatformAnalytics analytics={analytics} />
    </div>
  );
}
