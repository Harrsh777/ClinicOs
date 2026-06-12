import { requireRole } from "@/lib/auth/session";
import { getAIBillingInsights, getHealthRiskFlags, getFollowUpTasks, getAIUsageSummary } from "@/lib/actions/ai-insights";
import { PageHeader, Card, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles, AlertTriangle, Heart, MessageSquare, Brain } from "lucide-react";

export default async function OwnerAIInsightsPage() {
  const profile = await requireRole(["clinic_owner"]);
  const clinicId = profile.clinic_id!;

  const [billingInsights, healthRisks, followUps, aiUsage] = await Promise.all([
    getAIBillingInsights(clinicId),
    getHealthRiskFlags(clinicId),
    getFollowUpTasks(clinicId),
    getAIUsageSummary(clinicId),
  ]);

  const totalAICost = Object.values(aiUsage).reduce((s, v) => s + v.cost, 0);
  const pendingFollowUps = followUps.filter((f) => !["adherence_yes", "adherence_no"].includes(f.status)).length;

  return (
    <div>
      <PageHeader title="AI Insights" subtitle="Billing alerts, health risks, and follow-up tracking" />

      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <StatCard label="Billing Alerts" value={billingInsights.length} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Health Risks" value={healthRisks.length} icon={<Heart className="h-5 w-5" />} />
        <StatCard label="Pending Follow-ups" value={pendingFollowUps} icon={<MessageSquare className="h-5 w-5" />} />
        <StatCard label="AI Cost (est.)" value={`$${totalAICost.toFixed(3)}`} icon={<Brain className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-[var(--brand-500)]" />
            <h3 className="font-semibold">Billing Assistant</h3>
          </div>
          {billingInsights.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No billing issues detected.</p>
          ) : (
            <div className="space-y-3">
              {billingInsights.map((insight) => (
                <div key={insight.id} className="p-3 rounded-[var(--radius-md)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{insight.title}</span>
                    <Badge variant={insight.severity === "high" ? "danger" : "warning"}>{insight.severity}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">{insight.description}</p>
                  <Link href={insight.actionHref}>
                    <Button variant="ghost" size="sm">{insight.actionLabel}</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Population Health Risks</h3>
          {healthRisks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No active health risk flags.</p>
          ) : (
            <div className="space-y-2">
              {healthRisks.map((risk) => (
                <div key={risk.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <span className="text-sm font-medium">{risk.risk_type}</span>
                    <p className="text-xs text-[var(--text-muted)]">
                      {(risk.patients as { full_name: string })?.full_name}
                    </p>
                  </div>
                  <Badge variant={risk.severity === "high" || risk.severity === "critical" ? "danger" : "warning"}>
                    {risk.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Follow-Up Tasks</h3>
          {followUps.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No follow-up tasks yet.</p>
          ) : (
            <table className="clinic-table w-full">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Medicine</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((task) => (
                  <tr key={task.id}>
                    <td>{(task.patients as { full_name: string })?.full_name}</td>
                    <td>{task.medicine_name}</td>
                    <td><Badge variant="neutral">{task.status.replace(/_/g, " ")}</Badge></td>
                    <td className="text-sm text-[var(--text-muted)]">
                      {new Date(task.scheduled_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
