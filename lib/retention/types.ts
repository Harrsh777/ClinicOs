import type { EngagementReminderType } from "@/lib/engagement/types";

export type RetentionReason =
  | "overdue_follow_up"
  | "inactive_patient"
  | "medicine_reminder"
  | "vaccination_due"
  | "doctor_attention"
  | "no_response";

export const RETENTION_REASON_LABELS: Record<RetentionReason, string> = {
  overdue_follow_up: "Overdue follow-up",
  inactive_patient: "Inactive (90+ days)",
  medicine_reminder: "Medicine reminder due",
  vaccination_due: "Vaccination due",
  doctor_attention: "Needs doctor attention",
  no_response: "No response to reminder",
};

export interface RetentionPatientRow {
  patientId: string;
  patientName: string;
  patientPhone: string;
  lastVisitAt: string | null;
  daysSinceVisit: number | null;
  visitReason: string;
  complaint: string | null;
  lastDiagnosis: string | null;
  doctorName: string | null;
  retentionReasons: RetentionReason[];
  reminderId: string | null;
  reminderType: EngagementReminderType | null;
  followUpDate: string | null;
  reminderStatus: string | null;
  suggestedReminderType: EngagementReminderType;
}

export interface RetentionDashboardData {
  clinicName: string;
  stats: {
    totalVisited: number;
    overdueThisMonth: number;
    inactivePatients: number;
    doctorAttention: number;
    readyToSend: number;
    totalAtRisk: number;
  };
  patients: RetentionPatientRow[];
}
