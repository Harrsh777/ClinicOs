const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export type OpeningHours = Record<string, { open: string; close: string } | null>;

export interface ClinicHoursStatus {
  isOpen: boolean;
  dayKey: DayKey;
  localTime: string;
  opensAt?: string;
  closesAt?: string;
  message: string;
}

function normalizeTime(value: string) {
  const [h, m] = value.split(":");
  return `${String(Number(h)).padStart(2, "0")}:${String(Number(m ?? 0)).padStart(2, "0")}`;
}

export function getClinicLocalParts(timeZone = "Asia/Kolkata") {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  const dayMap: Record<string, DayKey> = {
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
  };
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return {
    dayKey: dayMap[weekday] ?? "mon",
    localTime: normalizeTime(`${hour}:${minute}`),
  };
}

export function getClinicHoursStatus(
  openingHours: OpeningHours | null | undefined,
  timeZone = "Asia/Kolkata"
): ClinicHoursStatus {
  const { dayKey, localTime } = getClinicLocalParts(timeZone);
  const todayHours = openingHours?.[dayKey];

  if (!todayHours?.open || !todayHours?.close) {
    return {
      isOpen: false,
      dayKey,
      localTime,
      message: "Clinic is closed today.",
    };
  }

  const open = normalizeTime(todayHours.open);
  const close = normalizeTime(todayHours.close);

  if (localTime < open) {
    return {
      isOpen: false,
      dayKey,
      localTime,
      opensAt: open,
      closesAt: close,
      message: `Clinic opens at ${open}.`,
    };
  }

  if (localTime >= close) {
    return {
      isOpen: false,
      dayKey,
      localTime,
      opensAt: open,
      closesAt: close,
      message: `Clinic closed for today (hours ${open}–${close}).`,
    };
  }

  return {
    isOpen: true,
    dayKey,
    localTime,
    opensAt: open,
    closesAt: close,
    message: `Open until ${close}.`,
  };
}

export function getTodayDateInClinicTz(timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date()
  );
}

export function getCurrentTimeInClinicTz(timeZone = "Asia/Kolkata") {
  return getClinicLocalParts(timeZone).localTime;
}
