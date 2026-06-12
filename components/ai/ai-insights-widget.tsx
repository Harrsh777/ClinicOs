import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertTriangle, Heart, MessageSquare } from "lucide-react";
import type { BillingInsight } from "@/lib/ai/billing-assistant";

interface AIInsightsWidgetProps {
  billingInsights: BillingInsight[];
  healthRisks: {
    id: string;
    risk_type: string;
    severity: string;
    patients: { full_name: string } | null;
  }[];
  followUpCount: number;
}

export function AIInsightsWidget({ billingInsights, healthRisks, followUpCount }: AIInsightsWidgetProps) {
  const severityVariant = (s: string): "danger" | "warning" | "neutral" =>
    s === "high" || s === "critical" ? "danger" : s === "medium" ? "warning" : "neutral";

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--brand-500)]" />
          <h3 className="font-semibold">AI Insights</h3>
        </div>
        <Link href="/owner/ai-insights">
          <Button variant="ghost" size="sm">View all</Button>
        </Link>
      </div>

      {billingInsights.length === 0 && healthRisks.length === 0 && followUpCount === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">All clear — no AI-flagged items right now.</p>
      ) : (
        <div className="space-y-3">
          {billingInsights.slice(0, 3).map((insight) => (
            <div key={insight.id} className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
              <AlertTriangle className="h-4 w-4 text-[var(--warning-500)] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{insight.title}</span>
                  <Badge variant={severityVariant(insight.severity)}>{insight.severity}</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{insight.description}</p>
              </div>
              <Link href={insight.actionHref}>
                <Button variant="ghost" size="sm">{insight.actionLabel}</Button>
              </Link>
            </div>
          ))}

          {healthRisks.slice(0, 2).map((risk) => (
            <div key={risk.id} className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
              <Heart className="h-4 w-4 text-[var(--danger-500)] shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium">{risk.risk_type}</span>
                <Badge variant={severityVariant(risk.severity)} className="ml-2">{risk.severity}</Badge>
                <p className="text-xs text-[var(--text-muted)]">
                  {risk.patients?.full_name ?? "Patient"}
                </p>
              </div>
            </div>
          ))}

          {followUpCount > 0 && (
            <div className="flex items-center gap-3 py-2">
              <MessageSquare className="h-4 w-4 text-[var(--brand-500)]" />
              <span className="text-sm">{followUpCount} follow-up task(s) pending response</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
