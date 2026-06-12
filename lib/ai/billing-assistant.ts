export interface BillingInsight {
  id: string;
  type: "missing_bill" | "duplicate_bill" | "unpaid_invoice" | "expired_insurance";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

interface BillingData {
  consultationsWithoutBills: { id: string; patientName: string; date: string }[];
  unpaidBills: { id: string; patientName: string; amount: number; daysOverdue: number }[];
  duplicateBills: { patientName: string; count: number }[];
  expiringPolicies: { patientName: string; company: string; expiryDate: string }[];
}

export function generateBillingInsights(data: BillingData): BillingInsight[] {
  const insights: BillingInsight[] = [];

  for (const c of data.consultationsWithoutBills) {
    insights.push({
      id: `missing-${c.id}`,
      type: "missing_bill",
      severity: "high",
      title: "Missing bill after consultation",
      description: `${c.patientName} — consultation on ${c.date} has no invoice.`,
      actionLabel: "Create bill",
      actionHref: "/owner/billing",
    });
  }

  for (const b of data.unpaidBills.filter((x) => x.daysOverdue > 7)) {
    insights.push({
      id: `unpaid-${b.id}`,
      type: "unpaid_invoice",
      severity: b.daysOverdue > 14 ? "high" : "medium",
      title: "Overdue invoice",
      description: `${b.patientName} owes ₹${b.amount.toFixed(0)} (${b.daysOverdue} days overdue).`,
      actionLabel: "View invoice",
      actionHref: `/owner/billing/${b.id}`,
    });
  }

  for (const d of data.duplicateBills) {
    insights.push({
      id: `dup-${d.patientName}`,
      type: "duplicate_bill",
      severity: "medium",
      title: "Possible duplicate billing",
      description: `${d.patientName} has ${d.count} bills on the same day.`,
      actionLabel: "Review bills",
      actionHref: "/owner/billing",
    });
  }

  for (const p of data.expiringPolicies) {
    insights.push({
      id: `ins-${p.patientName}`,
      type: "expired_insurance",
      severity: "medium",
      title: "Insurance expiring soon",
      description: `${p.patientName}'s ${p.company} policy expires ${p.expiryDate}.`,
      actionLabel: "View policy",
      actionHref: "/owner/billing",
    });
  }

  return insights.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}
