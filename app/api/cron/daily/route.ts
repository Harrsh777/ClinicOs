import { NextResponse } from "next/server";
import { GET as bookingExpiry } from "../booking-expiry/route";
import { GET as engagement } from "../engagement/route";
import { GET as reminders } from "../reminders/route";
import { GET as sameDayReminders } from "../same-day-reminders/route";
import { GET as followUp } from "../follow-up/route";
import { GET as billingCheck } from "../billing-check/route";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Combined daily cron job endpoint.
 * Consolidates all background tasks into a single execution per day
 * to comply with Vercel Hobby plan cron limits (1 cron job/day).
 */
export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    const bookingRes = await bookingExpiry(request);
    results.bookingExpiry = await bookingRes.json();
  } catch (e) {
    results.bookingExpiry = { error: String(e) };
  }

  try {
    const engagementRes = await engagement(request);
    results.engagement = await engagementRes.json();
  } catch (e) {
    results.engagement = { error: String(e) };
  }

  try {
    const remindersRes = await reminders(request);
    results.reminders = await remindersRes.json();
  } catch (e) {
    results.reminders = { error: String(e) };
  }

  try {
    const sameDayRes = await sameDayReminders(request);
    results.sameDayReminders = await sameDayRes.json();
  } catch (e) {
    results.sameDayReminders = { error: String(e) };
  }

  try {
    const followUpRes = await followUp(request);
    results.followUp = await followUpRes.json();
  } catch (e) {
    results.followUp = { error: String(e) };
  }

  try {
    const billingRes = await billingCheck(request);
    results.billingCheck = await billingRes.json();
  } catch (e) {
    results.billingCheck = { error: String(e) };
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
