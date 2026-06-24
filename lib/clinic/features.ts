import { createServiceClient } from "@/lib/supabase/server";

export type ClinicFeatureKey =
  | "patients"
  | "appointments"
  | "queue"
  | "analytics"
  | "teleconsult"
  | "ai_insights"
  | "white_label"
  | "pharmacy"
  | "lab"
  | "billing";

export type ClinicFeatures = Record<ClinicFeatureKey, boolean>;

export type ClinicLimits = {
  max_staff?: number;
  max_patients?: number;
};

const DEFAULT_FEATURES: ClinicFeatures = {
  patients: true,
  appointments: true,
  queue: true,
  analytics: false,
  teleconsult: false,
  ai_insights: false,
  white_label: false,
  pharmacy: true,
  lab: true,
  billing: true,
};

const FEATURE_ROUTE_GUARDS: { prefix: string; feature: ClinicFeatureKey; upgradePath: string }[] = [
  { prefix: "/owner/teleconsult", feature: "teleconsult", upgradePath: "/owner/settings?upgrade=teleconsult" },
  { prefix: "/doctor/teleconsult", feature: "teleconsult", upgradePath: "/doctor" },
  { prefix: "/patient/teleconsult", feature: "teleconsult", upgradePath: "/patient" },
  { prefix: "/owner/ai-insights", feature: "ai_insights", upgradePath: "/owner/settings?upgrade=ai_insights" },
  { prefix: "/owner/revenue", feature: "analytics", upgradePath: "/owner/settings?upgrade=analytics" },
  { prefix: "/owner/franchise", feature: "white_label", upgradePath: "/owner/settings?upgrade=white_label" },
  { prefix: "/owner/branding", feature: "white_label", upgradePath: "/owner/settings?upgrade=white_label" },
  { prefix: "/owner/pharmacy", feature: "pharmacy", upgradePath: "/owner/settings?upgrade=pharmacy" },
  { prefix: "/pharmacist", feature: "pharmacy", upgradePath: "/pharmacist" },
  { prefix: "/patient/pharmacy", feature: "pharmacy", upgradePath: "/patient" },
  { prefix: "/owner/lab", feature: "lab", upgradePath: "/owner/settings?upgrade=lab" },
  { prefix: "/lab-tech", feature: "lab", upgradePath: "/lab-tech" },
  { prefix: "/patient/lab", feature: "lab", upgradePath: "/patient" },
];

export async function getClinicFeatures(clinicId: string | null): Promise<{
  features: ClinicFeatures;
  limits: ClinicLimits;
  planSlug: string | null;
  subscriptionStatus: string | null;
}> {
  if (!clinicId) {
    return { features: DEFAULT_FEATURES, limits: {}, planSlug: null, subscriptionStatus: null };
  }

  const service = await createServiceClient();
  const { data: sub } = await service
    .from("subscriptions")
    .select("status, plans(slug, features, limits)")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  const plan = sub?.plans as unknown as {
    slug: string;
    features: Partial<ClinicFeatures>;
    limits: ClinicLimits;
  } | null;

  if (!sub || sub.status === "canceled") {
    return {
      features: { ...DEFAULT_FEATURES, teleconsult: false, ai_insights: false, analytics: false },
      limits: plan?.limits ?? {},
      planSlug: plan?.slug ?? "free",
      subscriptionStatus: sub?.status ?? "none",
    };
  }

  return {
    features: { ...DEFAULT_FEATURES, ...(plan?.features ?? {}) },
    limits: plan?.limits ?? {},
    planSlug: plan?.slug ?? null,
    subscriptionStatus: sub.status,
  };
}

export function getFeatureRouteGuard(pathname: string) {
  return FEATURE_ROUTE_GUARDS.find((g) => pathname.startsWith(g.prefix));
}

export function isFeatureEnabled(features: ClinicFeatures, key: ClinicFeatureKey): boolean {
  return features[key] !== false;
}
