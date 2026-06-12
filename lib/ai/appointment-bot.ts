export interface AppointmentIntent {
  intent: "book" | "cancel" | "status" | "unknown";
  date?: string;
  time?: string;
  doctorName?: string;
  confidence: number;
}

const BOOK_PATTERNS = [
  /book\s+(?:an?\s+)?appointment/i,
  /need\s+(?:an?\s+)?appointment/i,
  /schedule\s+(?:an?\s+)?(?:visit|appointment)/i,
  /want\s+to\s+see\s+(?:the\s+)?doctor/i,
];

const CANCEL_PATTERNS = [/cancel\s+(?:my\s+)?appointment/i, /reschedule/i];
const STATUS_PATTERNS = [/appointment\s+status/i, /when\s+is\s+my\s+appointment/i];

function extractDate(text: string): string | undefined {
  const tomorrow = /tomorrow/i.test(text);
  const today = /today/i.test(text);
  const d = new Date();
  if (tomorrow) {
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
  if (today) return d.toISOString().split("T")[0];

  const match = text.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (match) {
    const year = match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : String(d.getFullYear());
    const month = match[2].padStart(2, "0");
    const day = match[1].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return undefined;
}

function extractTime(text: string): string | undefined {
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return undefined;
  let hour = parseInt(match[1], 10);
  const mins = match[2] ?? "00";
  const ampm = match[3]?.toLowerCase();
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${mins}`;
}

export function parseAppointmentMessage(message: string): AppointmentIntent {
  const text = message.trim();

  if (BOOK_PATTERNS.some((p) => p.test(text))) {
    return {
      intent: "book",
      date: extractDate(text),
      time: extractTime(text),
      confidence: 0.85,
    };
  }
  if (CANCEL_PATTERNS.some((p) => p.test(text))) {
    return { intent: "cancel", confidence: 0.8 };
  }
  if (STATUS_PATTERNS.some((p) => p.test(text))) {
    return { intent: "status", confidence: 0.8 };
  }

  return { intent: "unknown", confidence: 0.3 };
}

export function formatBookingReply(
  patientName: string,
  date: string,
  time: string,
  doctorName: string
): string {
  return `Hi ${patientName}! Your appointment is confirmed for ${date} at ${time} with Dr. ${doctorName}. Please arrive 10 minutes early. Reply CANCEL to cancel.`;
}

export function formatReminderReply(date: string, time: string, clinicName: string): string {
  return `Reminder from ${clinicName}: You have an appointment tomorrow (${date}) at ${time}. Reply YES to confirm or CANCEL to reschedule.`;
}
