import { ASSIGNABLE_MODULES } from "@/lib/auth/permissions";

/** Modules that can be toggled per clinic (excludes platform-only modules). */
export const CLINIC_MODULE_KEYS = [
  "dashboard",
  ...ASSIGNABLE_MODULES,
] as const;

export type ClinicModuleKey = (typeof CLINIC_MODULE_KEYS)[number];

/** Modules that must stay enabled for the clinic to function. */
export const CORE_CLINIC_MODULES: ClinicModuleKey[] = ["dashboard", "settings"];

const PLATFORM_ONLY_MODULES = new Set([
  "clinics",
  "plans",
  "analytics",
  "applications",
  "demo_requests",
  "clinic_requests",
]);

export type ClinicModuleMap = Record<string, boolean>;

const ROLE_ROUTE_PREFIXES = [
  "/owner",
  "/doctor",
  "/receptionist",
  "/finance",
  "/nurse",
  "/pharmacist",
  "/lab-tech",
  "/hr",
  "/administrator",
  "/patient",
] as const;

const PATH_SEGMENT_TO_MODULE: Record<string, string> = {
  patients: "patients",
  appointments: "appointments",
  queue: "queue",
  consultations: "consultations",
  prescriptions: "prescriptions",
  lab: "lab",
  pharmacy: "pharmacy",
  inventory: "inventory",
  billing: "billing",
  insurance: "insurance",
  revenue: "revenue",
  accounting: "accounting",
  commissions: "commissions",
  staff: "staff",
  teleconsult: "teleconsult",
  franchise: "franchise",
  settings: "settings",
  branding: "branding",
  permissions: "permissions",
  "ai-insights": "ai_insights",
  retention: "patients",
  "follow-ups": "patients",
  onboarding: "",
  "change-password": "",
};

export function defaultModuleMap(): ClinicModuleMap {
  const map: ClinicModuleMap = {};
  for (const key of CLINIC_MODULE_KEYS) {
    map[key] = true;
  }
  return map;
}

export function isClinicModuleEnabled(modules: ClinicModuleMap, moduleKey: string): boolean {
  if (PLATFORM_ONLY_MODULES.has(moduleKey)) return true;
  if (moduleKey in modules) return modules[moduleKey] !== false;
  return true;
}

export function getModuleKeyFromPath(pathname: string): string | null {
  if (pathname.startsWith("/pharmacist")) return "pharmacy";
  if (pathname.startsWith("/lab-tech")) return "lab";

  let relative = pathname;
  for (const prefix of ROLE_ROUTE_PREFIXES) {
    if (pathname === prefix) return "dashboard";
    if (pathname.startsWith(`${prefix}/`)) {
      relative = pathname.slice(prefix.length);
      break;
    }
  }

  if (!relative || relative === "/") return "dashboard";

  const segment = relative.split("/").filter(Boolean)[0] ?? "";
  const moduleKey = PATH_SEGMENT_TO_MODULE[segment];
  if (moduleKey === "") return null;
  return moduleKey ?? null;
}

export function isPlatformOnlyModule(moduleKey: string): boolean {
  return PLATFORM_ONLY_MODULES.has(moduleKey);
}
