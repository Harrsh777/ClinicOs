import type { EngagementScheduleRule } from "@/lib/engagement/types";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** Days before target date to send the reminder. */
export function offsetDaysForRule(rule: EngagementScheduleRule): number {
  switch (rule) {
    case "tomorrow":
      return 1;
    case "3_days":
      return 3;
    case "7_days":
      return 7;
    case "15_days":
      return 15;
    case "monthly":
      return 7;
    case "yearly":
      return 14;
    case "custom":
      return 1;
    default:
      return 1;
  }
}

/** Compute the date the reminder should be sent, relative to a target/event date. */
export function computeSendOnDate(
  targetDate: string,
  rule: EngagementScheduleRule,
  customSendOnDate?: string
): string {
  if (rule === "custom" && customSendOnDate) return customSendOnDate;
  const offset = offsetDaysForRule(rule);
  return addDays(targetDate, -offset);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function tomorrowStr(): string {
  return addDays(todayStr(), 1);
}
