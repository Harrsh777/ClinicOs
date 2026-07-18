import type { EngagementReminderType } from "@/lib/engagement/types";

export type RetentionReason =
  | "overdue_follow_up"
  | "inactive_patient"
  | "medicine_reminder"
  | "vaccination_due"
  | "doctor_attention"
  | "no_response"
  | "has_dues";

export const RETENTION_REASON_LABELS: Record<RetentionReason, string> = {
  overdue_follow_up: "Overdue follow-up",
  inactive_patient: "Inactive (6+ months)",
  medicine_reminder: "Medicine reminder due",
  vaccination_due: "Vaccination due",
  doctor_attention: "Needs doctor attention",
  no_response: "No response to reminder",
  has_dues: "Has outstanding dues",
};

export type RetentionSortKey =
  | "name_asc"
  | "name_desc"
  | "last_visit_newest"
  | "last_visit_oldest"
  | "dues_high"
  | "dues_low"
  | "priority";

export const RETENTION_SORT_LABELS: Record<RetentionSortKey, string> = {
  name_asc: "Name A–Z",
  name_desc: "Name Z–A",
  last_visit_newest: "Last visit (newest)",
  last_visit_oldest: "Last visit (oldest)",
  dues_high: "Dues (highest)",
  dues_low: "Dues (lowest)",
  priority: "Priority (at-risk first)",
};

export interface RetentionPatientRow {
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  lastVisitAt: string | null;
  daysSinceVisit: number | null;
  visitReason: string;
  visitReasonEditable: boolean;
  complaint: string | null;
  lastDiagnosis: string | null;
  doctorName: string | null;
  dueAmount: number;
  dueFromBills: number;
  hasDueOverride: boolean;
  retentionReasons: RetentionReason[];
  reminderId: string | null;
  reminderType: EngagementReminderType | null;
  followUpDate: string | null;
  reminderStatus: string | null;
  suggestedReminderType: EngagementReminderType;
  hasVisitHistory: boolean;
}

export interface RetentionDashboardData {
  clinicName: string;
  stats: {
    totalPatients: number;
    totalVisited: number;
    withDues: number;
    totalDues: number;
    overdueThisMonth: number;
    inactivePatients: number;
    doctorAttention: number;
    readyToSend: number;
    totalAtRisk: number;
  };
  patients: RetentionPatientRow[];
}

export const RETENTION_CSV_HEADERS = [
  "full_name",
  "phone",
  "last_visit_date",
  "visit_reason",
  "due_amount",
] as const;

export type RetentionCsvRow = {
  full_name: string;
  phone: string;
  last_visit_date?: string;
  visit_reason?: string;
  due_amount?: string;
};
