export type EngagementReminderType =
  | "clinical_follow_up"
  | "medicine"
  | "vaccination"
  | "bp_review"
  | "diabetes_review"
  | "physiotherapy"
  | "pregnancy"
  | "annual_checkup"
  | "birthday"
  | "inactive_patient";

export type EngagementScheduleRule =
  | "tomorrow"
  | "3_days"
  | "7_days"
  | "15_days"
  | "monthly"
  | "yearly"
  | "custom";

export interface InteractiveOption {
  id: number;
  label: string;
  emoji?: string;
}

export interface RecoveryAnalysis {
  recovery_status: string;
  priority: "low" | "medium" | "high" | "critical";
  doctor_attention_required: boolean;
  summary: string;
  selected_option_id?: number;
}

export interface EngagementMessageContext {
  patientName: string;
  complaint?: string | null;
  diagnosis?: string | null;
  doctorName?: string | null;
  followUpDate?: string | null;
  advice?: string | null;
  clinicName: string;
  reminderType: EngagementReminderType;
}

export interface GeneratedEngagementMessage {
  message: string;
  options: InteractiveOption[];
}

export interface PatientAIBrief {
  previous_diagnosis: string;
  recovery_progress: string;
  current_medications: string[];
  missed_follow_ups: string[];
  patient_responses: Array<{
    date: string;
    response: string;
    recovery_status?: string;
    priority?: string;
  }>;
  doctor_attention_items: string[];
  summary: string;
}

export const REMINDER_TYPE_LABELS: Record<EngagementReminderType, string> = {
  clinical_follow_up: "Clinical follow-up",
  medicine: "Medicine reminder",
  vaccination: "Vaccination reminder",
  bp_review: "Blood pressure review",
  diabetes_review: "Diabetes review",
  physiotherapy: "Physiotherapy follow-up",
  pregnancy: "Pregnancy follow-up",
  annual_checkup: "Annual check-up",
  birthday: "Birthday wishes",
  inactive_patient: "Inactive patient re-engagement",
};
