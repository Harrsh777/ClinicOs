export type UserRole =
  | "super_admin"
  | "clinic_owner"
  | "doctor"
  | "receptionist"
  | "finance_manager"
  | "nurse"
  | "pharmacist"
  | "lab_technician"
  | "hr"
  | "administrator"
  | "patient";

export type PermissionLevel = "read" | "write" | "admin";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed"
  | "no_show";

export type AppointmentType = "scheduled" | "walk_in" | "emergency" | "vip" | "teleconsult";
export type AppointmentPriority = "normal" | "vip" | "emergency";
export type TokenStatus =
  | "waiting"
  | "called"
  | "serving"
  | "completed"
  | "skipped"
  | "no_show"
  | "cancelled";
export type AllergySeverity = "mild" | "moderate" | "severe";
export type DocumentType = "report" | "xray" | "mri" | "prescription" | "insurance" | "other";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  clinic_id: string | null;
  staff_code: string | null;
  department_id: string | null;
  is_active: boolean;
  first_login: boolean;
  specialization: string | null;
  created_at: string;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface ClinicApplication {
  id: string;
  clinic_name: string;
  owner_name: string;
  owner_email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  plan_slug: string;
  status: ApplicationStatus;
  admin_notes: string | null;
  clinic_id: string | null;
  created_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  clinic_code: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: "active" | "suspended" | "trial";
  consultation_fee_default: number;
  daily_patient_capacity?: number;
  opening_hours: Record<string, { open: string; close: string } | null>;
  settings: Record<string, unknown>;
  clinic_setup_completed?: boolean;
  clinic_type?: string | null;
  registration_number?: string | null;
  gst_number?: string | null;
  emergency_contact?: string | null;
  website?: string | null;
  enabled_services?: string[];
}

export interface SystemModule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  route_path: string;
  sort_order: number;
}

export interface StaffModulePermission {
  id: string;
  profile_id: string;
  clinic_id: string;
  module_key: string;
  permission_level: PermissionLevel;
}

export interface Patient {
  id: string;
  clinic_id: string;
  user_id: string | null;
  patient_code: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  aadhaar_last_four: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PatientVitals {
  id: string;
  patient_id: string;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  temperature_c: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  spo2: number | null;
  blood_sugar: number | null;
  recorded_at: string;
}

export interface PatientAllergy {
  id: string;
  patient_id: string;
  allergen: string;
  severity: AllergySeverity;
  reaction: string | null;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  type: AppointmentType;
  priority: AppointmentPriority;
  rejection_reason: string | null;
  notes: string | null;
  is_late: boolean;
  created_at: string;
  patients?: Patient;
  doctors?: Doctor;
}

export interface Doctor {
  id: string;
  profile_id: string;
  clinic_id: string;
  specialization: string | null;
  consultation_fee: number | null;
  slot_duration_mins: number;
  is_accepting_appointments: boolean;
  profiles?: Profile;
  department?: string | null;
  room_number?: string | null;
  queue_status?: string;
  queue_paused?: boolean;
  avg_consultation_mins?: number | null;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface QueueSession {
  id: string;
  clinic_id: string;
  session_date: string;
  current_token: number;
  avg_consultation_mins: number;
  is_active: boolean;
}

export interface QueueToken {
  id: string;
  session_id: string;
  clinic_id: string;
  token_number: number;
  patient_id: string;
  appointment_id: string | null;
  doctor_id: string | null;
  status: TokenStatus;
  priority: AppointmentPriority;
  called_at: string | null;
  patients?: Patient;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

export const ROLE_ROUTES: Record<UserRole, string> = {
  super_admin: "/admin",
  clinic_owner: "/owner",
  doctor: "/doctor",
  receptionist: "/receptionist",
  finance_manager: "/finance",
  nurse: "/nurse",
  pharmacist: "/pharmacist",
  lab_technician: "/lab-tech",
  hr: "/hr",
  administrator: "/administrator",
  patient: "/patient",
};

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
