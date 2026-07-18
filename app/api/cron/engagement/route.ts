import { NextResponse } from "next/server";
import { processBirthdayReminders, processInactivePatientReminders } from "@/lib/actions/engagement-reminders";
import { processDueFollowUpReminders } from "@/lib/actions/follow-up-reminders";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Daily engagement cron: schedule birthday/inactive campaigns, then send due reminders */
export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Schedule first so same-day send_on_date rows are included in processDue
  const [birthdays, inactive] = await Promise.all([
    processBirthdayReminders(),
    processInactivePatientReminders(),
  ]);
  const reminders = await processDueFollowUpReminders();

  return NextResponse.json({
    success: true,
    reminders,
    birthdays,
    inactive,
  });
}
