export interface GrowthSettings {
  googleReviewEnabled: boolean;
  googleReviewUrl: string;
  reactivateEnabled: boolean;
  noShowRemindersEnabled: boolean;
}

export const DEFAULT_GROWTH_SETTINGS: GrowthSettings = {
  googleReviewEnabled: false,
  googleReviewUrl: "",
  reactivateEnabled: false,
  noShowRemindersEnabled: false,
};

/** Inactive reactivation horizons in days (6 / 12 / 18 months). */
export const REACTIVATE_HORIZONS = [180, 365, 540] as const;
export type ReactivateHorizonDays = (typeof REACTIVATE_HORIZONS)[number];

export function parseGrowthSettings(
  settings: Record<string, unknown> | null | undefined
): GrowthSettings {
  const growth = (settings?.growth ?? {}) as Record<string, unknown>;
  return {
    googleReviewEnabled: Boolean(growth.googleReviewEnabled),
    googleReviewUrl: typeof growth.googleReviewUrl === "string" ? growth.googleReviewUrl.trim() : "",
    reactivateEnabled: Boolean(growth.reactivateEnabled),
    noShowRemindersEnabled: Boolean(growth.noShowRemindersEnabled),
  };
}

export function mergeGrowthSettings(
  settings: Record<string, unknown> | null | undefined,
  growth: GrowthSettings
): Record<string, unknown> {
  const next = { ...(settings ?? {}) };
  next.growth = {
    googleReviewEnabled: growth.googleReviewEnabled,
    googleReviewUrl: growth.googleReviewUrl,
    reactivateEnabled: growth.reactivateEnabled,
    noShowRemindersEnabled: growth.noShowRemindersEnabled,
  };
  return next;
}

export function inactiveHorizonForDays(daysSinceVisit: number): ReactivateHorizonDays | null {
  if (daysSinceVisit >= 540) return 540;
  if (daysSinceVisit >= 365) return 365;
  if (daysSinceVisit >= 180) return 180;
  return null;
}

export function inactiveHorizonLabel(days: number): string {
  if (days >= 540) return "Inactive (18+ months)";
  if (days >= 365) return "Inactive (12+ months)";
  if (days >= 180) return "Inactive (6+ months)";
  return "Inactive";
}
