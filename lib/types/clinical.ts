export type ConsultationStatus = "in_progress" | "completed" | "cancelled";
export type BillStatus = "draft" | "unpaid" | "partial" | "paid" | "cancelled";
export type BillLineType = "consultation" | "lab" | "medicine" | "procedure" | "other";
export type PaymentMethod = "cash" | "upi" | "card" | "insurance" | "other";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type LabOrderStatus = "ordered" | "sample_collected" | "processing" | "completed" | "cancelled";
export type ClaimStatus = "draft" | "submitted" | "processing" | "approved" | "rejected" | "paid";

export interface Consultation {
  id: string;
  clinic_id: string;
  appointment_id: string | null;
  queue_token_id: string | null;
  doctor_id: string;
  patient_id: string;
  status: ConsultationStatus;
  started_at: string;
  ended_at: string | null;
  patients?: { full_name: string; phone: string };
  doctors?: { profiles?: { full_name: string } };
}

export interface ConsultationNotes {
  consultation_id: string;
  symptoms: string | null;
  diagnosis: string | null;
  clinical_notes: string | null;
}

export interface EmrRecord {
  id: string;
  patient_id: string;
  consultation_id: string;
  visit_number: number;
  summary: Record<string, unknown>;
  vitals_snapshot: Record<string, unknown> | null;
  addendum: string | null;
  created_at: string;
  consultations?: { appointment_id: string | null } | null;
}

export interface ClinicVisitWithAppointment {
  id: string;
  visit_code: string;
  booking_id: string;
  appointment_id?: string | null;
  visit_type: string;
  payment_status: string;
  check_in_status: string;
  token_label: string | null;
  receipt_number: string | null;
  created_at: string;
  checked_in_at: string | null;
  appointments?: {
    appointment_date: string;
    appointment_time: string;
    status: string;
    appointment_number: string | null;
    notes: string | null;
    booking_symptoms: string | null;
    booking_notes: string | null;
    doctors?: { profiles?: { full_name: string } | { full_name: string }[] } | null;
  } | null;
}

export interface PatientVisitTimeline {
  emrRecords: EmrRecord[];
  clinicVisits: ClinicVisitWithAppointment[];
}

export interface PrescriptionItem {
  id?: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  allergy_acknowledged?: boolean;
}

export interface Prescription {
  id: string;
  consultation_id: string;
  patient_id: string;
  doctor_id: string;
  notes: string | null;
  pdf_path: string | null;
  created_at: string;
  prescription_items?: PrescriptionItem[];
}

export interface Bill {
  id: string;
  clinic_id: string;
  patient_id: string;
  consultation_id: string | null;
  invoice_number: string;
  status: BillStatus;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  insurance_amount: number;
  patient_amount: number;
  created_at: string;
  patients?: { full_name: string; phone: string };
  bill_line_items?: BillLineItem[];
}

export interface BillLineItem {
  id: string;
  description: string;
  item_type: BillLineType;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Payment {
  id: string;
  bill_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  receipt_number: string | null;
  paid_at: string | null;
}

export interface LabTest {
  id: string;
  name: string;
  code: string;
  price: number;
  is_active: boolean;
}

export interface LabOrder {
  id: string;
  patient_id: string;
  consultation_id: string | null;
  status: LabOrderStatus;
  created_at: string;
  lab_order_items?: { test_id: string; price: number; lab_tests?: LabTest }[];
  lab_reports?: LabReport[];
}

export interface LabReport {
  id: string;
  lab_order_id: string;
  file_name: string | null;
  file_path: string | null;
  result_values: Record<string, unknown> | null;
  ai_summary: string | null;
  ai_abnormal_flags: Record<string, unknown> | null;
  uploaded_at: string;
}

export interface InsurancePolicy {
  id: string;
  patient_id: string;
  company: string;
  policy_number: string;
  member_id: string | null;
  coverage_percent: number;
  expiry_date: string;
  is_active: boolean;
}

export interface InsuranceClaim {
  id: string;
  policy_id: string;
  bill_id: string | null;
  claim_amount: number;
  approved_amount: number | null;
  status: ClaimStatus;
  created_at: string;
  insurance_policies?: InsurancePolicy;
}

export interface PharmacyMedicine {
  id: string;
  name: string;
  generic_name: string | null;
  unit: string;
  reorder_level: number;
}

export interface PharmacyStock {
  id: string;
  medicine_id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  selling_price: number | null;
  pharmacy_medicines?: PharmacyMedicine;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorder_level: number;
}
