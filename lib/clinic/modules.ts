import { createServiceClient } from "@/lib/supabase/server";
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

function defaultModuleMap(): ClinicModuleMap {
  const map: ClinicModuleMap = {};
  for (const key of CLINIC_MODULE_KEYS) {
    map[key] = true;
  }
  return map;
}

export async function getClinicModules(clinicId: string | null): Promise<ClinicModuleMap> {
  if (!clinicId) return defaultModuleMap();

  const service = await createServiceClient();
  const { data } = await service
    .from("clinic_modules")
    .select("module_key, enabled")
    .eq("clinic_id", clinicId);

  if (!data?.length) return defaultModuleMap();

  const map = defaultModuleMap();
  for (const row of data) {
    if (row.module_key in map) {
      map[row.module_key] = row.enabled;
    }
  }
  for (const core of CORE_CLINIC_MODULES) {
    map[core] = true;
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

export async function getClinicModuleCatalog() {
  const service = await createServiceClient();
  const { data } = await service
    .from("system_modules")
    .select("key, name, description, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).filter((m) => !PLATFORM_ONLY_MODULES.has(m.key) && CLINIC_MODULE_KEYS.includes(m.key as ClinicModuleKey));
}

export async function initializeClinicModules(clinicId: string, enabledKeys?: string[]) {
  const service = await createServiceClient();
  const keys = enabledKeys ?? [...CLINIC_MODULE_KEYS];
  const rows = keys.map((module_key) => ({
    clinic_id: clinicId,
    module_key,
    enabled: true,
  }));

  const { error } = await service.from("clinic_modules").upsert(rows, {
    onConflict: "clinic_id,module_key",
  });

  if (error) throw new Error(error.message);
}

export async function updateClinicModules(
  clinicId: string,
  modules: { moduleKey: string; enabled: boolean }[]
) {
  const service = await createServiceClient();
  const rows = modules
    .filter((m) => CLINIC_MODULE_KEYS.includes(m.moduleKey as ClinicModuleKey))
    .map((m) => ({
      clinic_id: clinicId,
      module_key: m.moduleKey,
      enabled: CORE_CLINIC_MODULES.includes(m.moduleKey as ClinicModuleKey) ? true : m.enabled,
      updated_at: new Date().toISOString(),
    }));

  const { error } = await service.from("clinic_modules").upsert(rows, {
    onConflict: "clinic_id,module_key",
  });

  if (error) return { error: error.message };
  return { success: true as const };
}
