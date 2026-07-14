import type { RetentionDashboardData, RetentionPatientRow, RetentionReason } from "@/lib/retention/types";
import { RETENTION_REASON_LABELS } from "@/lib/retention/types";

export type RetentionInsightCategory =
  | "dues"
  | "follow_up"
  | "health"
  | "engagement"
  | "operations";

export interface RetentionInsight {
  id: string;
  category: RetentionInsightCategory;
  priority: "high" | "medium" | "low";
  title: string;
  recommendation: string;
  actionLabel?: string;
  filterKey?: RetentionInsightFilterKey;
}

export type RetentionInsightFilterKey =
  | "all"
  | "on_track"
  | "has_dues"
  | "no_visit"
  | RetentionReason;

export interface RetentionInsightsResult {
  summary: string;
  highlights: Array<{
    id: string;
    title: string;
    value: number | string;
    description: string;
    color: string;
    filterKey?: RetentionInsightFilterKey;
  }>;
  insights: RetentionInsight[];
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function countByReason(patients: RetentionPatientRow[], reason: RetentionReason) {
  return patients.filter((p) => p.retentionReasons.includes(reason)).length;
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function topDuePatients(patients: RetentionPatientRow[], limit = 2) {
  return [...patients]
    .filter((p) => p.dueAmount > 0)
    .sort((a, b) => b.dueAmount - a.dueAmount)
    .slice(0, limit);
}

function doctorAttentionPatients(patients: RetentionPatientRow[], limit = 2) {
  return patients
    .filter((p) => p.retentionReasons.includes("doctor_attention"))
    .slice(0, limit);
}

export function generateRetentionInsights(data: RetentionDashboardData): RetentionInsightsResult {
  const { stats, patients } = data;
  const insights: RetentionInsight[] = [];

  const onTrack = patients.filter((p) => p.retentionReasons.length === 0).length;
  const noVisit = patients.filter((p) => !p.hasVisitHistory).length;
  const overdueFollowUp = countByReason(patients, "overdue_follow_up");
  const noResponse = countByReason(patients, "no_response");
  const medicineDue = countByReason(patients, "medicine_reminder");
  const vaccinationDue = countByReason(patients, "vaccination_due");
  const avgDue = stats.withDues > 0 ? stats.totalDues / stats.withDues : 0;
  const atRiskPct = pct(stats.totalAtRisk, stats.totalPatients);
  const visitedPct = pct(stats.totalVisited, stats.totalPatients);

  if (stats.doctorAttention > 0) {
    const names = doctorAttentionPatients(patients)
      .map((p) => p.patientName)
      .join(", ");

    insights.push({
      id: "doctor-attention",
      category: "health",
      priority: "high",
      title: "Patients need doctor review",
      recommendation:
        stats.doctorAttention === 1
          ? "One patient was flagged after a follow-up response suggesting their condition may need clinical review. Prioritize a callback or sooner appointment today."
          : `${stats.doctorAttention} patients need doctor attention based on follow-up signals. ${names ? `Start with ${names}${stats.doctorAttention > 2 ? " and others" : ""}. ` : ""}Review these before sending routine WhatsApp reminders.`,
      actionLabel: "View flagged patients",
      filterKey: "doctor_attention",
    });
  }

  if (stats.withDues > 0) {
    const topDues = topDuePatients(patients);
    const topNames = topDues.map((p) => `${p.patientName} (${formatInr(p.dueAmount)})`).join("; ");

    insights.push({
      id: "outstanding-dues",
      category: "dues",
      priority: stats.totalDues > 5000 ? "high" : "medium",
      title: "Collect outstanding dues",
      recommendation:
        stats.withDues === 1
          ? `One patient owes ${formatInr(stats.totalDues)}. A polite WhatsApp reminder before their next visit often clears small balances within 48 hours.`
          : `${stats.withDues} patients owe a combined ${formatInr(stats.totalDues)} (avg ${formatInr(avgDue)} each). ${topNames ? `Highest balances: ${topNames}. ` : ""}Send payment reminders this week — pair dues collection with a care check-in for better response rates.`,
      actionLabel: "Filter by dues",
      filterKey: "has_dues",
    });
  }

  if (stats.overdueThisMonth > 0 || overdueFollowUp > 0) {
    const count = Math.max(stats.overdueThisMonth, overdueFollowUp);
    insights.push({
      id: "overdue-follow-up",
      category: "follow_up",
      priority: count >= 3 ? "high" : "medium",
      title: "Follow-ups overdue this month",
      recommendation:
        count === 1
          ? "One patient missed a scheduled follow-up date this month. Send a WhatsApp nudge to re-book — chronic and post-treatment cases are highest priority."
          : `${count} patients have overdue follow-ups this month. Batch a reminder today; patients on medicine or chronic care plans should be called if they don't reply within 2 days.`,
      actionLabel: "View overdue follow-ups",
      filterKey: "overdue_follow_up",
    });
  }

  if (stats.inactivePatients > 0) {
    insights.push({
      id: "inactive-patients",
      category: "engagement",
      priority: stats.inactivePatients >= 5 ? "high" : "medium",
      title: "Re-engage inactive patients",
      recommendation:
        stats.inactivePatients === 1
          ? "One patient hasn't visited in 90+ days. A seasonal health checkup or preventive screening message can bring them back before they switch clinics."
          : `${stats.inactivePatients} patients are inactive (no visit in 90+ days). Run a win-back broadcast — mention a specific service tied to their last visit reason for better open rates.`,
      actionLabel: "View inactive patients",
      filterKey: "inactive_patient",
    });
  }

  if (noResponse > 0) {
    insights.push({
      id: "no-response",
      category: "engagement",
      priority: "medium",
      title: "Patients not replying to reminders",
      recommendation:
        noResponse === 1
          ? "One patient hasn't replied to a sent reminder in 3+ days. Try a shorter personal message or a phone call — silent patients on medicine follow-ups may need escalation."
          : `${noResponse} patients haven't responded to reminders. Switch from template messages to personalized outreach for the top-priority cases first.`,
      actionLabel: "View no-response",
      filterKey: "no_response",
    });
  }

  if (medicineDue > 0) {
    insights.push({
      id: "medicine-reminder",
      category: "follow_up",
      priority: "medium",
      title: "Medicine adherence follow-ups due",
      recommendation:
        medicineDue === 1
          ? "One patient has a medicine reminder due. Confirm they're taking medication as prescribed — early non-adherence is easier to correct than a relapse."
          : `${medicineDue} patients have medicine reminders scheduled. Send adherence check-ins this week; flag any 'feeling worse' replies for doctor review.`,
      actionLabel: "View medicine reminders",
      filterKey: "medicine_reminder",
    });
  }

  if (vaccinationDue > 0) {
    insights.push({
      id: "vaccination-due",
      category: "follow_up",
      priority: "low",
      title: "Vaccination reminders pending",
      recommendation:
        vaccinationDue === 1
          ? "One patient may be due for a vaccination based on their last visit. A timely booster reminder protects the patient and drives a booked slot."
          : `${vaccinationDue} patients have vaccination-related follow-ups. Batch a preventive care message — monsoon and flu season campaigns work well here.`,
      actionLabel: "View vaccination due",
      filterKey: "vaccination_due",
    });
  }

  if (noVisit > 0) {
    insights.push({
      id: "no-visit",
      category: "operations",
      priority: "low",
      title: "Patients without visit history",
      recommendation:
        noVisit === 1
          ? "One patient was added but has no visit date or reason yet. Add last visit details so retention messages can be personalized instead of generic broadcasts."
          : `${noVisit} patients have no visit history on file (${pct(noVisit, stats.totalPatients)}% of your list). Import or edit visit reason and date — personalized messages convert 2–3× better than generic blasts.`,
      actionLabel: "View without visits",
      filterKey: "no_visit",
    });
  }

  if (stats.readyToSend > 0 && stats.totalAtRisk > 0) {
    insights.push({
      id: "ready-to-send",
      category: "engagement",
      priority: "low",
      title: "Reminders ready to send",
      recommendation:
        stats.readyToSend === 1
          ? "One scheduled reminder is ready to go out today. Sending on time keeps patients engaged and reduces overdue follow-ups next month."
          : `${stats.readyToSend} reminders are queued and ready to send. Clear today's queue before end of day to stay ahead of next week's follow-up workload.`,
      actionLabel: "View all patients",
      filterKey: "all",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "all-clear",
      category: "operations",
      priority: "low",
      title: "Retention list is healthy",
      recommendation:
        stats.totalPatients === 0
          ? "Add or import patients to start tracking visits, dues, and automated follow-ups."
          : `All ${stats.totalPatients} patients are on track — no overdue follow-ups, inactive patients, or outstanding clinical flags. Keep sending timely check-ins after each visit to maintain this.`,
      actionLabel: stats.totalPatients === 0 ? undefined : "View on-track patients",
      filterKey: stats.totalPatients === 0 ? undefined : "on_track",
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedInsights = insights
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 4);

  let summary: string;
  if (stats.totalPatients === 0) {
    summary = "Import your patient list to unlock retention insights and WhatsApp follow-ups.";
  } else if (stats.totalAtRisk === 0) {
    summary = `${onTrack} of ${stats.totalPatients} patients are on track with no retention flags.`;
  } else if (stats.doctorAttention > 0) {
    summary = `${stats.totalAtRisk} patients need attention — ${stats.doctorAttention} require doctor review${stats.withDues > 0 ? ` and ${stats.withDues} have outstanding dues` : ""}.`;
  } else if (stats.withDues > 0) {
    summary = `${stats.totalAtRisk} at-risk patients; ${formatInr(stats.totalDues)} in dues across ${stats.withDues} accounts.`;
  } else {
    summary = `${stats.totalAtRisk} of ${stats.totalPatients} patients (${atRiskPct}%) are at risk — mostly ${RETENTION_REASON_LABELS[sortedInsights[0]?.filterKey as RetentionReason] ?? "follow-up related"}.`;
  }

  const highlights = [
    {
      id: "at-risk",
      title: "At risk",
      value: stats.totalAtRisk,
      description: atRiskPct > 0 ? `${atRiskPct}% of patient list` : "No flags detected",
      color: stats.totalAtRisk > 0 ? "#EF4444" : "#14B8A6",
      filterKey: stats.totalAtRisk > 0 ? ("all" as const) : undefined,
    },
    {
      id: "dues",
      title: "Outstanding dues",
      value: stats.withDues > 0 ? formatInr(stats.totalDues) : 0,
      description: stats.withDues > 0 ? `${stats.withDues} patients` : "All clear",
      color: "#8B5CF6",
      filterKey: stats.withDues > 0 ? ("has_dues" as const) : undefined,
    },
    {
      id: "doctor",
      title: "Doctor attention",
      value: stats.doctorAttention,
      description: stats.doctorAttention > 0 ? "Needs clinical review" : "No urgent flags",
      color: "#F59E0B",
      filterKey: stats.doctorAttention > 0 ? ("doctor_attention" as const) : undefined,
    },
    {
      id: "visited",
      title: "Visit coverage",
      value: `${visitedPct}%`,
      description: `${stats.totalVisited} of ${stats.totalPatients} visited`,
      color: "#2563EB",
      filterKey: noVisit > 0 ? ("no_visit" as const) : undefined,
    },
  ];

  return { summary, highlights, insights: sortedInsights };
}
