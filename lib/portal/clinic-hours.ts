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
  return formatClinicDate(new Date(), timeZone);
}

export function getCurrentTimeInClinicTz(timeZone = "Asia/Kolkata") {
  return getClinicLocalParts(timeZone).localTime;
}

export function formatClinicDate(date: Date, timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date
  );
}

export function toClinicDateKey(isoTimestamp: string, timeZone = "Asia/Kolkata") {
  return formatClinicDate(new Date(isoTimestamp), timeZone);
}

function getClinicDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}:${get("second")}`,
  };
}

/** UTC ISO bounds for a calendar day in the clinic timezone (inclusive end). */
export function getClinicDayBoundsUtc(
  dateStr?: string,
  timeZone = "Asia/Kolkata"
): { start: string; end: string; date: string } {
  const date = dateStr ?? getTodayDateInClinicTz(timeZone);
  const [y, m, d] = date.split("-").map(Number);

  let startMs = 0;
  let endMs = 0;
  let foundStart = false;

  const roughUtc = Date.UTC(y, m - 1, d, -5, -30, 0);
  for (let ms = roughUtc - 6 * 3600_000; ms <= roughUtc + 6 * 3600_000; ms += 1000) {
    const { date: localDate, time } = getClinicDateTimeParts(new Date(ms), timeZone);
    if (localDate === date && time === "00:00:00" && !foundStart) {
      startMs = ms;
      foundStart = true;
    }
    if (localDate === date && time === "23:59:59") {
      endMs = ms + 999;
    }
  }

  if (!foundStart) {
    startMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
    endMs = startMs + 86400000 - 1;
  } else if (!endMs) {
    endMs = startMs + 86400000 - 1;
  }

  return {
    date,
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  };
}

export function addClinicCalendarDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().split("T")[0]!;
}

export function formatClinicDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}
