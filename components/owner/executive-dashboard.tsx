import Link from "next/link";
import { Card, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExecutiveDashboardData } from "@/lib/actions/executive-dashboard";
import {
  IndianRupee, Clock, Users, TrendingUp, TrendingDown, UserPlus,
  UserCheck, UserX, Sparkles, AlertTriangle, Heart, MessageSquare,
  Building2, Stethoscope,
} from "lucide-react";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
      {title}
    </h2>
  );
}

export function ExecutiveDashboard({ data }: { data: ExecutiveDashboardData }) {
  return (
    <div className="space-y-8">
      {data.isFranchise && (
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--brand-200)] bg-[var(--brand-50)] px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-[var(--brand-700)]">
            <Building2 className="h-4 w-4" />
            <span>Franchise view — {data.branchCount} branches consolidated</span>
          </div>
          <Link href="/owner/franchise">
            <Button variant="secondary" size="sm">Manage Branches</Button>
          </Link>
        </div>
      )}

      <div>
        <SectionHeader title="Business" />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Revenue Today" value={formatCurrency(data.business.revenueToday)} icon={<IndianRupee className="h-5 w-5" />} />
          <StatCard label="Revenue This Month" value={formatCurrency(data.business.revenueThisMonth)} icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard
            label="Outstanding Payments"
            value={formatCurrency(data.business.outstandingPayments)}
            icon={<AlertTriangle className="h-5 w-5" />}
            trend={data.business.outstandingCount > 0 ? `${data.business.outstandingCount} invoices` : undefined}
          />
        </div>
      </div>

      <div>
        <SectionHeader title="Operations" />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Patients Waiting" value={data.operations.patientsWaiting} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Average Wait Time" value={`${data.operations.averageWaitMins} min`} icon={<Clock className="h-5 w-5" />} />
          <StatCard
            label="Doctor Utilization"
            value={`${data.operations.doctorUtilization}%`}
            icon={<Stethoscope className="h-5 w-5" />}
            trend={`${data.operations.activeDoctors}/${data.operations.totalDoctors} active`}
          />
        </div>
      </div>

      <div>
        <SectionHeader title="Growth" />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="New Patients" value={data.growth.newPatients} icon={<UserPlus className="h-5 w-5" />} trend="This month" />
          <StatCard label="Returning Patients" value={data.growth.returningPatients} icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="Lost Patients" value={data.growth.lostPatients} icon={<UserX className="h-5 w-5" />} trend="No visit in 90 days" />
        </div>
      </div>

      <div>
        <SectionHeader title="AI Insights" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="!p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">Revenue Leak Detected</p>
                <p className="text-2xl font-bold mt-1 text-[var(--danger-500)]">{data.aiInsights.revenueLeak}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Missing bills & overdue</p>
              </div>
              <TrendingDown className="h-5 w-5 text-[var(--danger-500)]" />
            </div>
            {data.aiInsights.revenueLeak > 0 && (
              <Link href="/owner/ai-insights" className="mt-3 inline-block">
                <Button variant="ghost" size="sm">Review</Button>
              </Link>
            )}
          </Card>

          <Card className="!p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">Follow-Up Opportunity</p>
                <p className="text-2xl font-bold mt-1 text-[var(--brand-600)]">{data.aiInsights.followUpOpportunities}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Pending responses</p>
              </div>
              <MessageSquare className="h-5 w-5 text-[var(--brand-500)]" />
            </div>
          </Card>

          <Card className="!p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">High-Risk Patients</p>
                <p className="text-2xl font-bold mt-1 text-[var(--warning-700)]">{data.aiInsights.highRiskPatients}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Active health flags</p>
              </div>
              <Heart className="h-5 w-5 text-[var(--warning-500)]" />
            </div>
          </Card>

          <Card className="!p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">Low Performing Branch</p>
                {data.aiInsights.lowPerformingBranch ? (
                  <>
                    <p className="text-lg font-bold mt-1">{data.aiInsights.lowPerformingBranch}</p>
                    <Badge variant="warning" className="mt-1">Needs attention</Badge>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] mt-2">All branches performing well</p>
                )}
              </div>
              <Sparkles className="h-5 w-5 text-[var(--accent-500)]" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
