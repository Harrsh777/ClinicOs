import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardAIRecommendation } from "@/lib/ai/dashboard-recommendations";
import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  revenue: "#EF4444",
  payments: "#8B5CF6",
  follow_up: "#2563EB",
  health: "#F59E0B",
  growth: "#14B8A6",
  operations: "#64748B",
};

const priorityVariant = (p: string): "danger" | "warning" | "neutral" =>
  p === "high" ? "danger" : p === "medium" ? "warning" : "neutral";

export function AIRecommendationsList({
  recommendations,
  compact = false,
}: {
  recommendations: DashboardAIRecommendation[];
  compact?: boolean;
}) {
  if (!recommendations.length) return null;

  return (
    <div className={cn("space-y-3", !compact && "mt-6 border-t border-[var(--border)] pt-6")}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-50)]">
          <Sparkles className="h-4 w-4 text-[var(--brand-600)]" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            AI-written recommendations
          </h4>
          <p className="text-xs text-[var(--text-muted)]">
            Prioritized actions based on your clinic data
          </p>
        </div>
      </div>

      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        {recommendations.map((rec) => {
          const color = categoryColors[rec.category] ?? "#64748B";
          return (
            <div
              key={rec.id}
              className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-white to-[var(--surface-1)] p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-2 w-2 rounded-full shrink-0 mt-1.5"
                    style={{ background: color }}
                  />
                  <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                    {rec.title}
                  </p>
                </div>
                <Badge variant={priorityVariant(rec.priority)} className="shrink-0 text-[10px]">
                  {rec.priority}
                </Badge>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed pl-4">
                {rec.recommendation}
              </p>
              {rec.actionHref && rec.actionLabel && (
                <Link href={rec.actionHref} className="inline-block pl-4 mt-3">
                  <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs font-semibold">
                    {rec.actionLabel}
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
