export interface AppointmentIntent {
  intent: "book" | "cancel" | "status" | "help" | "unknown";
  date?: string;
  time?: string;
  reason?: string;
  doctorName?: string;
  consultationType?: "normal" | "video";
  confidence: number;
}

const BOOK_PATTERNS = [
  /book\s+(?:a\s+)?(?:consultation|appointment|visit)/i,
  /need\s+(?:a\s+)?(?:consultation|appointment|visit)/i,
  /schedule\s+(?:a\s+)?(?:consultation|visit|appointment)/i,
  /want\s+to\s+see\s+(?:the\s+)?doctor/i,
  /(?:i\s+)?(?:want|need)\s+(?:a\s+)?doctor/i,
  /^book$/i,
  /^consultation$/i,
];

const CANCEL_PATTERNS = [
  /cancel\s+(?:my\s+)?(?:consultation|appointment|visit|booking)/i,
  /^cancel$/i,
  /reschedule/i,
];

const STATUS_PATTERNS = [
  /(?:appointment|consultation|booking)\s+status/i,
  /when\s+is\s+my\s+(?:appointment|consultation)/i,
  /my\s+(?:next\s+)?(?:appointment|consultation)/i,
];

const HELP_PATTERNS = [/^(help|hi|hello|start)$/i, /how\s+(?:do\s+i|to)\s+book/i];

const REASON_PATTERNS = [
  /(?:for|because|reason[:\s]+|symptoms?[:\s]+|complaint[:\s]+)(.+)/i,
  /(?:suffering\s+from|having)\s+(.+)/i,
];

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

function extractDate(text: string): string | undefined {
  const d = new Date();
  if (/tomorrow/i.test(text)) {
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
  if (/today/i.test(text)) return d.toISOString().split("T")[0];

  const namedMonth = text.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?/i
  );
  if (namedMonth) {
    const day = namedMonth[1].padStart(2, "0");
    const monthKey = namedMonth[2].toLowerCase().slice(0, 3);
    const monthNum = MONTH_NAMES[monthKey] ?? MONTH_NAMES[namedMonth[2].toLowerCase()];
    if (monthNum) {
      const year = namedMonth[3] ?? String(d.getFullYear());
      return `${year}-${String(monthNum).padStart(2, "0")}-${day}`;
    }
  }

  const slashMatch = text.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (slashMatch) {
    const year = slashMatch[3]
      ? slashMatch[3].length === 2
        ? `20${slashMatch[3]}`
        : slashMatch[3]
      : String(d.getFullYear());
    const month = slashMatch[2].padStart(2, "0");
    const day = slashMatch[1].padStart(2, "0");
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
  if (!ampm && hour >= 1 && hour <= 8) hour += 12;
  return `${String(hour).padStart(2, "0")}:${mins}`;
}

function extractReason(text: string): string | undefined {
  for (const pattern of REASON_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const reason = match[1]
        .replace(/\s+on\s+.*/i, "")
        .replace(/\s+at\s+.*/i, "")
        .trim();
      if (reason.length >= 2 && reason.length <= 200) return reason;
    }
  }
  return undefined;
}

function extractDoctorName(text: string): string | undefined {
  const match = text.match(/(?:with\s+)?dr\.?\s+([a-z][a-z\s]{1,30})/i);
  return match?.[1]?.trim();
}

export function parseAppointmentMessage(message: string): AppointmentIntent {
  const text = message.trim();

  if (HELP_PATTERNS.some((p) => p.test(text))) {
    return { intent: "help", confidence: 0.9 };
  }
  if (CANCEL_PATTERNS.some((p) => p.test(text))) {
    return { intent: "cancel", confidence: 0.85 };
  }
  if (STATUS_PATTERNS.some((p) => p.test(text))) {
    return { intent: "status", confidence: 0.85 };
  }

  const isBook = BOOK_PATTERNS.some((p) => p.test(text));
  const hasDateOrTime = !!(extractDate(text) || extractTime(text));
  const hasReason = !!extractReason(text);

  if (isBook || (hasDateOrTime && hasReason)) {
    return {
      intent: "book",
      date: extractDate(text),
      time: extractTime(text),
      reason: extractReason(text),
      doctorName: extractDoctorName(text),
      consultationType: /video|teleconsult|online/i.test(text) ? "video" : "normal",
      confidence: isBook ? 0.9 : 0.75,
    };
  }

  if (hasDateOrTime || hasReason) {
    return {
      intent: "book",
      date: extractDate(text),
      time: extractTime(text),
      reason: extractReason(text) ?? (hasReason ? undefined : text.length <= 120 ? text : undefined),
      confidence: 0.6,
    };
  }

  return { intent: "unknown", confidence: 0.3 };
}

export function formatBookingPrompt(missing: ("date" | "time" | "reason")[]): string {
  const parts: string[] = [];
  if (missing.includes("date")) parts.push("date (e.g. tomorrow or 15/07)");
  if (missing.includes("time")) parts.push("time (e.g. 10:30 AM)");
  if (missing.includes("reason")) parts.push("reason for visit (e.g. fever, follow-up)");

  return `To book your consultation, please share: ${parts.join(", ")}.\n\nExample: "15 July at 3 PM for fever" or "tomorrow 10 AM headache"`;
}

export function formatBookingReply(
  patientName: string,
  date: string,
  time: string,
  doctorName: string,
  reason: string,
  isVideo = false
): string {
  const typeLabel = isVideo ? "Video consultation" : "Consultation";
  return (
    `Hi ${patientName}! Your ${typeLabel.toLowerCase()} is confirmed.\n\n` +
    `📅 ${date} at ${time}\n` +
    `👨‍⚕️ Dr. ${doctorName}\n` +
    `📝 Reason: ${reason}\n\n` +
    `Please arrive 10 minutes early${isVideo ? " — your doctor will send a video link before the session" : ""}.\n` +
    `Reply STATUS for details or CANCEL to cancel.`
  );
}

export function formatReminderReply(
  date: string,
  time: string,
  clinicName: string,
  reason?: string
): string {
  const reasonLine = reason ? `\nReason: ${reason}` : "";
  return (
    `Reminder: Appointment tomorrow at ${time} (${date}) at ${clinicName}.${reasonLine}\n\n` +
    `Reply YES to confirm or CANCEL to cancel.`
  );
}

export function formatHelpReply(clinicName: string): string {
  return (
    `Welcome to ${clinicName}! Here's how to book via WhatsApp:\n\n` +
    `📌 BOOK — start a new consultation booking\n` +
    `📌 "Book tomorrow 10 AM for fever" — book in one message\n` +
    `📌 STATUS — check your upcoming appointment\n` +
    `📌 CANCEL — cancel your next appointment\n\n` +
    `For video consultations, include "video" in your message.`
  );
}
