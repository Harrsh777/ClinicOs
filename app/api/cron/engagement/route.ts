import { NextResponse } from "next/server";
import { processBirthdayReminders, processInactivePatientReminders } from "@/lib/actions/engagement-reminders";
import { processDueFollowUpReminders } from "@/lib/actions/follow-up-reminders";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Daily engagement cron: send due reminders + schedule birthday/inactive campaigns */
export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [reminders, birthdays, inactive] = await Promise.all([
    processDueFollowUpReminders(),
    processBirthdayReminders(),
    processInactivePatientReminders(),
  ]);

  return NextResponse.json({
    success: true,
    reminders,
    birthdays,
    inactive,
  });
}
