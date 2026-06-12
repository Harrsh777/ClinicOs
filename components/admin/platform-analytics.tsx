import { Card, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, IndianRupee, Sparkles, TrendingDown } from "lucide-react";

interface PlatformAnalyticsProps {
  analytics: {
    totalClinics: number;
    activeClinics: number;
    mrr: number;
    churnRate: string;
    aiByFeature: Record<string, { tokens: number; cost: number }>;
    topAIClinics: { clinicId: string; cost: number }[];
  };
}

export function PlatformAnalytics({ analytics }: PlatformAnalyticsProps) {
  const aiFeatures = Object.entries(analytics.aiByFeature);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Clinics" value={analytics.totalClinics} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Active Clinics" value={analytics.activeClinics} icon={<Building2 className="h-5 w-5" />} />
        <StatCard
          label="MRR"
          value={`₹${analytics.mrr.toLocaleString("en-IN")}`}
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <StatCard label="Churn Rate" value={`${analytics.churnRate}%`} icon={<TrendingDown className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-[var(--brand-500)]" />
            <h3 className="font-semibold">AI Usage by Feature</h3>
          </div>
          {aiFeatures.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No AI usage logged yet.</p>
          ) : (
            <div className="space-y-3">
              {aiFeatures.map(([feature, data]) => (
                <div key={feature} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <span className="text-sm font-medium capitalize">{feature.replace(/_/g, " ")}</span>
                    <p className="text-xs text-[var(--text-muted)]">{data.tokens.toLocaleString()} tokens</p>
                  </div>
                  <Badge variant="info">${data.cost.toFixed(4)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Top AI Cost Clinics</h3>
          {analytics.topAIClinics.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {analytics.topAIClinics.map((c, i) => (
                <div key={c.clinicId} className="flex justify-between text-sm py-2">
                  <span>#{i + 1} Clinic {c.clinicId.slice(0, 8)}...</span>
                  <span className="font-medium">${c.cost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
