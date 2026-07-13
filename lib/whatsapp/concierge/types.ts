export type ConciergeFlow = "book" | "reschedule" | "ask" | "reports" | "reception";

export type ConciergeStep =
  | "menu"
  | "collect_name"
  | "select_department"
  | "select_doctor"
  | "select_date"
  | "select_slot"
  | "collect_reason"
  | "ask_question"
  | "reschedule_confirm";

export interface ConciergeSession {
  id: string;
  clinic_id: string;
  patient_phone: string;
  patient_id: string | null;
  patient_name: string | null;
  state: string;
  step: ConciergeStep | string | null;
  flow: ConciergeFlow | string | null;
  department_id: string | null;
  department_name: string | null;
  doctor_id: string | null;
  desired_date: string | null;
  desired_time: string | null;
  reason: string | null;
  consultation_type: "normal" | "emergency" | "video";
  reschedule_appointment_id: string | null;
  source: string | null;
}

export interface PatientContext {
  id: string;
  full_name: string;
  phone: string;
  last_visit_at: string | null;
  isReturning: boolean;
}

export interface DepartmentOption {
  id: string | null;
  name: string;
  index: number;
}

export interface DoctorOption {
  id: string;
  name: string;
  specialization: string | null;
  index: number;
}

export interface ConciergeResult {
  reply: string;
  intent: string;
  handled: boolean;
  booked?: boolean;
  appointmentId?: string;
}
