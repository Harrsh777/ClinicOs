import type { UserRole } from "@/lib/types/database";

export const STAFF_CODE_PREFIX: Record<UserRole, string | null> = {
  super_admin: null,
  clinic_owner: "OWN",
  doctor: "DOC",
  receptionist: "REC",
  finance_manager: "FIN",
  nurse: "NUR",
  pharmacist: "PHA",
  lab_technician: "LAB",
  hr: "HR",
  administrator: "ADM",
  patient: null,
};

export const STAFF_LOGIN_ROLES: UserRole[] = [
  "clinic_owner",
  "doctor",
  "receptionist",
  "finance_manager",
  "nurse",
  "pharmacist",
  "lab_technician",
  "hr",
  "administrator",
];

export function normalizeStaffCode(code: string) {
  return code.trim().toUpperCase();
}
