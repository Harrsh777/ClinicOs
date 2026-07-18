/** WhatsApp copy for growth automations (Google review, reactivation, no-show). */

export function formatGoogleReviewMessage(params: {
  doctorName?: string | null;
  clinicName: string;
  reviewUrl: string;
}): string {
  const doctor = params.doctorName?.trim()
    ? params.doctorName.replace(/^Dr\.?\s*/i, "").trim()
    : null;
  const visitLine = doctor
    ? `Thank you for visiting Dr. ${doctor} at ${params.clinicName}.`
    : `Thank you for visiting ${params.clinicName}.`;

  return (
    `${visitLine}\n` +
    `Would you mind leaving a Google Review?\n\n` +
    `${params.reviewUrl}`
  );
}

export function formatReactivateMessage(params: {
  clinicName: string;
  patientName?: string | null;
  inactiveDays?: number;
}): string {
  const firstName = params.patientName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hello ${firstName},\n\n` : "";
  const months =
    params.inactiveDays != null && params.inactiveDays >= 540
      ? "quite some time"
      : params.inactiveDays != null && params.inactiveDays >= 365
        ? "over a year"
        : "a while";

  return (
    `${greeting}It's been ${months} since your last consultation at ${params.clinicName}.\n\n` +
    `Book your health checkup when you're ready.\n\n` +
    `Reply BOOK to schedule an appointment.`
  );
}

export function formatDayBeforeReminder(params: {
  time: string;
  clinicName: string;
  date?: string;
  reason?: string;
}): string {
  const reasonLine = params.reason ? `\nReason: ${params.reason}` : "";
  const datePart = params.date ? ` (${params.date})` : "";
  return (
    `Reminder: Appointment tomorrow at ${params.time}${datePart} at ${params.clinicName}.${reasonLine}\n\n` +
    `Reply YES to confirm or CANCEL to cancel.`
  );
}

export function formatTwoHourReminder(params: {
  time: string;
  clinicName: string;
}): string {
  return (
    `See you in 2 hours for your appointment at ${params.time} at ${params.clinicName}.\n\n` +
    `Reply CANCEL if you need to reschedule.`
  );
}
