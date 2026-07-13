import { createServiceClient } from "@/lib/supabase/service";
import {
  CLINIC_MODULE_KEYS,
  CORE_CLINIC_MODULES,
  defaultModuleMap,
  isPlatformOnlyModule,
  type ClinicModuleKey,
  type ClinicModuleMap,
} from "@/lib/clinic/module-constants";

export {
  CLINIC_MODULE_KEYS,
  CORE_CLINIC_MODULES,
  getModuleKeyFromPath,
  isClinicModuleEnabled,
  type ClinicModuleKey,
  type ClinicModuleMap,
} from "@/lib/clinic/module-constants";

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

export async function getClinicModuleCatalog() {
  const service = await createServiceClient();
  const { data } = await service
    .from("system_modules")
    .select("key, name, description, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).filter(
    (m) => !isPlatformOnlyModule(m.key) && CLINIC_MODULE_KEYS.includes(m.key as ClinicModuleKey)
  );
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
