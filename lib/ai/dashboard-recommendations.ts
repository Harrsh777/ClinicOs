import { aiChatCompletion, parseAIJson } from "@/lib/ai/client";
import type { BillingInsight } from "@/lib/ai/billing-assistant";

export interface DashboardAIRecommendation {
  id: string;
  category: "revenue" | "follow_up" | "health" | "payments" | "growth" | "operations";
  priority: "high" | "medium" | "low";
  title: string;
  recommendation: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface DashboardRecommendationInput {
  clinicId: string;
  revenueLeak: number;
  followUpOpportunities: number;
  highRiskPatients: number;
  outstandingCount: number;
  outstandingPayments: number;
  revenueToday: number;
  revenueThisMonth: number;
  revenueGrowth: number;
  patientGrowth: number;
  billingInsights: BillingInsight[];
  healthRisks: Array<{ risk_type: string; severity: string; patientName: string }>;
  lowPerformingBranch: string | null;
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildRuleBasedDashboardRecommendations(
  input: DashboardRecommendationInput
): DashboardAIRecommendation[] {
  const recs: DashboardAIRecommendation[] = [];

  if (input.revenueLeak > 0) {
    const topMissing = input.billingInsights
      .filter((i) => i.type === "missing_bill")
      .slice(0, 2)
      .map((i) => i.description.replace(/ has no invoice\.$/, ""))
      .join("; ");

    recs.push({
      id: "revenue-leak",
      category: "revenue",
      priority: "high",
      title: "Close the billing gap",
      recommendation:
        input.revenueLeak === 1
          ? `One completed consultation still has no invoice. ${topMissing ? `${topMissing} — ` : ""}Creating the bill today prevents revenue leakage and keeps accounts accurate.`
          : `${input.revenueLeak} consultations were completed without invoices. ${topMissing ? `Start with: ${topMissing}. ` : ""}Billing these visits could recover significant revenue and improve month-end reconciliation.`,
      actionLabel: "Review billing",
      actionHref: "/owner/billing",
    });
  }

  if (input.outstandingCount > 0) {
    recs.push({
      id: "outstanding-payments",
      category: "payments",
      priority: input.outstandingPayments > 5000 ? "high" : "medium",
      title: "Accelerate collections",
      recommendation:
        input.outstandingCount === 1
          ? `One patient owes ${formatInr(input.outstandingPayments)}. Send a payment reminder via WhatsApp or follow up at the front desk before their next visit.`
          : `${input.outstandingCount} patients owe a combined ${formatInr(input.outstandingPayments)}. Prioritize invoices older than 7 days — a short WhatsApp reminder often clears 30–40% of small balances within 48 hours.`,
      actionLabel: "View invoices",
      actionHref: "/owner/billing",
    });
  }

  if (input.followUpOpportunities > 0) {
    recs.push({
      id: "follow-up",
      category: "follow_up",
      priority: input.followUpOpportunities >= 5 ? "high" : "medium",
      title: "Re-engage patients on follow-up",
      recommendation:
        input.followUpOpportunities === 1
          ? "One patient hasn't responded to a medicine adherence follow-up. A personal WhatsApp nudge from reception can improve adherence and catch complications early."
          : `${input.followUpOpportunities} patients have pending follow-up responses. Batch-send reminders this week — patients who reply 'feeling worse' should be flagged for a callback or sooner appointment.`,
      actionLabel: "Open follow-ups",
      actionHref: "/owner/ai-insights",
    });
  }

  if (input.highRiskPatients > 0) {
    const riskSummary = input.healthRisks
      .slice(0, 3)
      .map((r) => `${r.patientName} (${r.risk_type}, ${r.severity})`)
      .join("; ");

    recs.push({
      id: "health-risk",
      category: "health",
      priority: input.healthRisks.some((r) => r.severity === "high" || r.severity === "critical")
        ? "high"
        : "medium",
      title: "Review high-risk patients",
      recommendation:
        input.highRiskPatients === 1
          ? `One patient has an active health risk flag. Review vitals and consider scheduling a follow-up before the condition worsens.`
          : `${input.highRiskPatients} patients have active health flags. ${riskSummary ? `Focus on: ${riskSummary}. ` : ""}Prioritize critical and high-severity cases in tomorrow's doctor huddle.`,
      actionLabel: "View risk flags",
      actionHref: "/owner/ai-insights",
    });
  }

  if (input.revenueGrowth < -5) {
    recs.push({
      id: "revenue-decline",
      category: "growth",
      priority: "medium",
      title: "Revenue trending down",
      recommendation: `Monthly revenue is down ${Math.abs(input.revenueGrowth).toFixed(0)}% vs last month. Check if fewer walk-ins, cancelled appointments, or unbilled consultations are driving this — the billing and follow-up actions above may help recover momentum.`,
      actionLabel: "View dashboard",
      actionHref: "/owner",
    });
  } else if (input.patientGrowth > 10 && input.revenueGrowth < 5) {
    recs.push({
      id: "growth-opportunity",
      category: "growth",
      priority: "low",
      title: "Convert new patients to revenue",
      recommendation: `New patient volume is growing (${input.patientGrowth.toFixed(0)}%) but revenue growth lags. Ensure every new consultation gets billed promptly and consider a preventive health package for first-time visitors.`,
      actionLabel: "View patients",
      actionHref: "/owner/patients",
    });
  }

  if (input.lowPerformingBranch) {
    recs.push({
      id: "branch-performance",
      category: "operations",
      priority: "medium",
      title: "Branch needs attention",
      recommendation: `${input.lowPerformingBranch} is underperforming vs other branches this month. Compare queue throughput, doctor availability, and billing completion rates — small operational fixes often lift revenue faster than marketing spend.`,
      actionLabel: "Franchise overview",
      actionHref: "/owner/franchise",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "all-clear",
      category: "operations",
      priority: "low",
      title: "Clinic running smoothly",
      recommendation: `No urgent billing leaks, overdue payments, or follow-up backlogs detected. Revenue today is ${formatInr(input.revenueToday)}. Keep monitoring adherence follow-ups and ensure completed consultations are billed same-day.`,
      actionLabel: "View insights",
      actionHref: "/owner/ai-insights",
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 4);
}

export async function generateDashboardRecommendations(
  input: DashboardRecommendationInput
): Promise<DashboardAIRecommendation[]> {
  const fallback = buildRuleBasedDashboardRecommendations(input);

  const billingContext = input.billingInsights
    .slice(0, 5)
    .map((i) => `- [${i.severity}] ${i.title}: ${i.description}`)
    .join("\n");

  const healthContext = input.healthRisks
    .slice(0, 5)
    .map((r) => `- ${r.patientName}: ${r.risk_type} (${r.severity})`)
    .join("\n");

  const result = await aiChatCompletion({
    clinicId: input.clinicId,
    feature: "dashboard_insights",
    jsonMode: true,
    maxTokens: 900,
    systemPrompt: `You are a clinic operations advisor for an Indian healthcare practice using ClinicOS. Write concise, actionable recommendations for the clinic owner. Be specific with numbers provided. Use warm professional tone. No markdown. Each recommendation should be 1-2 sentences.`,
    userPrompt: `Clinic metrics:
- Revenue leak (unbilled consultations + overdue invoices): ${input.revenueLeak}
- Pending follow-up responses: ${input.followUpOpportunities}
- High-risk patients flagged: ${input.highRiskPatients}
- Outstanding payments: ${input.outstandingCount} patients, ${formatInr(input.outstandingPayments)} total
- Revenue today: ${formatInr(input.revenueToday)}
- Revenue this month: ${formatInr(input.revenueThisMonth)}
- Revenue growth vs last month: ${input.revenueGrowth.toFixed(1)}%
- Patient growth: ${input.patientGrowth.toFixed(1)}%
${input.lowPerformingBranch ? `- Underperforming branch: ${input.lowPerformingBranch}` : ""}

Billing alerts:
${billingContext || "None"}

Health risks:
${healthContext || "None"}

Return JSON:
{
  "summary": "One sentence executive overview for the clinic owner",
  "recommendations": [
    {
      "id": "unique-slug",
      "category": "revenue|follow_up|health|payments|growth|operations",
      "priority": "high|medium|low",
      "title": "short title",
      "recommendation": "1-2 sentence actionable insight",
      "actionLabel": "button label",
      "actionHref": "/owner/..."
    }
  ]
}
Provide 3-4 recommendations ordered by priority. Use real numbers from the data.`,
    metadata: { revenueLeak: input.revenueLeak, followUps: input.followUpOpportunities },
  });

  if (!result) return fallback;

  const parsed = parseAIJson<{
    summary?: string;
    recommendations?: DashboardAIRecommendation[];
  }>(result.content);

  if (!parsed?.recommendations?.length) return fallback;

  const recommendations = parsed.recommendations
    .filter((r) => r.title && r.recommendation)
    .slice(0, 4)
    .map((r, i) => ({
      id: r.id || `ai-rec-${i}`,
      category: r.category ?? "operations",
      priority: r.priority ?? "medium",
      title: r.title,
      recommendation: r.recommendation,
      actionLabel: r.actionLabel,
      actionHref: r.actionHref,
    }));

  if (parsed.summary && recommendations.length > 0) {
    return [
      {
        id: "executive-summary",
        category: "operations",
        priority: "medium",
        title: "Executive summary",
        recommendation: parsed.summary,
        actionLabel: "View all insights",
        actionHref: "/owner/ai-insights",
      },
      ...recommendations.slice(0, 3),
    ];
  }

  return recommendations.length > 0 ? recommendations : fallback;
}
