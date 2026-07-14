"use client";

import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  generateRetentionInsights,
  type RetentionInsightFilterKey,
} from "@/lib/retention/insights";
import type { RetentionDashboardData } from "@/lib/retention/types";
import { useMemo } from "react";

const categoryColors: Record<string, string> = {
  dues: "#8B5CF6",
  follow_up: "#2563EB",
  health: "#F59E0B",
  engagement: "#14B8A6",
  operations: "#64748B",
};

const priorityVariant = (p: string): "danger" | "warning" | "neutral" =>
  p === "high" ? "danger" : p === "medium" ? "warning" : "neutral";

interface RetentionAIInsightsProps {
  data: RetentionDashboardData;
  onFilterChange?: (filter: RetentionInsightFilterKey) => void;
}

export function RetentionAIInsights({ data, onFilterChange }: RetentionAIInsightsProps) {
  const { summary, highlights, insights } = useMemo(
    () => generateRetentionInsights(data),
    [data]
  );

  if (data.stats.totalPatients === 0) {
    return (
      <Card className="mt-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-50)]">
            <Sparkles className="h-4 w-4 text-[var(--brand-600)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Insights</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Actionable signals from your patient list
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{summary}</p>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-50)]">
            <Sparkles className="h-4 w-4 text-[var(--brand-600)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Insights</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Actionable recommendations from your patient list
            </p>
          </div>
        </div>
      </div>

      <p className="mb-4 rounded-xl border border-[var(--brand-100)] bg-[var(--brand-50)] px-4 py-3 text-sm text-[var(--brand-900)] leading-relaxed">
        {summary}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {highlights.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!item.filterKey || !onFilterChange}
            onClick={() => item.filterKey && onFilterChange?.(item.filterKey)}
            className={`rounded-2xl border border-[var(--border)] bg-gradient-to-br from-white to-[var(--surface-1)] p-4 text-left transition-all ${
              item.filterKey && onFilterChange
                ? "hover:border-[var(--brand-200)] hover:shadow-sm cursor-pointer"
                : "cursor-default"
            }`}
          >
            <p className="text-xs font-medium text-[var(--text-muted)]">{item.title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color: item.color }}>
              {item.value}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{item.description}</p>
          </button>
        ))}
      </div>

      <div className="space-y-3 border-t border-[var(--border)] pt-5">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
          Recommended actions
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((insight) => {
            const color = categoryColors[insight.category] ?? "#64748B";
            return (
              <div
                key={insight.id}
                className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-white to-[var(--surface-1)] p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-2 w-2 rounded-full shrink-0 mt-1.5"
                      style={{ background: color }}
                    />
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                      {insight.title}
                    </p>
                  </div>
                  <Badge variant={priorityVariant(insight.priority)} className="shrink-0 text-[10px]">
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed pl-4">
                  {insight.recommendation}
                </p>
                {insight.actionLabel && insight.filterKey && onFilterChange && (
                  <div className="pl-4 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-semibold"
                      onClick={() => onFilterChange(insight.filterKey!)}
                    >
                      {insight.actionLabel}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
