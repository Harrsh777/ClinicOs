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

export type DemoRequestStatus = "new" | "contacted" | "scheduled" | "closed" | "cancelled";

export interface DemoRequestClientMetadata {
  timezone?: string | null;
  screen_resolution?: string | null;
  submitted_at_client?: string;
}

export interface DemoRequest {
  id: string;
  clinic_name: string;
  doctor_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  clinic_type: string | null;
  preferred_date: string;
  preferred_time: string;
  notes: string | null;
  status: DemoRequestStatus;
  admin_notes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  accept_language: string | null;
  client_metadata: DemoRequestClientMetadata;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

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
  portal_enabled?: boolean;
  onboarding_progress?: Record<string, unknown>;
  google_maps_link?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  emergency_available?: boolean;
  parking_available?: boolean;
  wheelchair_access?: boolean;
  facility_images?: string[];
  other_facilities?: string[];
  registration_number?: string | null;
  gst_number?: string | null;
  emergency_contact?: string | null;
  enabled_services?: string[];
  branding?: ClinicBranding;
}

export type ClinicThemePreset =
  | "clinical_teal"
  | "kids_pediatric"
  | "dental_care"
  | "dermatology_rose"
  | "emergency_slate"
  | "holistic_sage";

export interface ClinicBranding {
  id?: string;
  clinic_id: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  theme_preset?: ClinicThemePreset;
  specialization_badge?: string | null;
  bio_description?: string | null;
  tagline?: string | null;
  whatsapp_number?: string | null;
  teleconsult_enabled?: boolean;
  emergency_enabled?: boolean;
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

export type CertificateCategory =
  | "sick_leave"
  | "fitness"
  | "medical_leave"
  | "return_to_work"
  | "hospitalization"
  | "vaccination"
  | "disability"
  | "pregnancy"
  | "travel_fitness"
  | "sports_fitness"
  | "custom";

export type CertificateStatus = "draft" | "issued" | "revoked" | "expired";

export interface CertificateTemplate {
  id: string;
  clinic_id: string | null;
  title: string;
  category: CertificateCategory;
  description: string | null;
  content_html: string;
  fields_schema: Array<{ key: string; label: string; type: "text" | "number" | "date" | "select"; options?: string[] }>;
  is_system: boolean;
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateSignature {
  id: string;
  clinic_id: string;
  doctor_id: string;
  asset_type: "digital_signature" | "handwritten_signature" | "clinic_stamp" | "header_logo" | "footer_logo";
  title: string;
  file_path: string;
  created_at: string;
}

export interface IssuedCertificate {
  id: string;
  certificate_code: string;
  clinic_id: string;
  template_id: string | null;
  template_version: number;
  patient_id: string;
  doctor_id: string;
  issued_at: string;
  expiry_date: string | null;
  status: CertificateStatus;
  revoked_reason: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  diagnosis: string | null;
  rest_duration_days: number | null;
  custom_fields_data: Record<string, unknown>;
  rendered_html: string;
  signature_url: string | null;
  stamp_url: string | null;
  header_url: string | null;
  qr_verification_token: string;
  expiring_share_token: string | null;
  share_token_expiry: string | null;
  watermark_text: string | null;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
  patients?: Patient;
  doctors?: Doctor;
  profiles?: Profile;
}

export interface CertificateAuditLog {
  id: string;
  certificate_id: string;
  action: string;
  performed_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
