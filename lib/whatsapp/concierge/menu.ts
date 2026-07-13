import { formatTime } from "@/lib/utils";
import type { ConciergeFlow, DepartmentOption, DoctorOption, PatientContext } from "./types";

export function formatWelcomeMenu(
  clinicName: string,
  patient?: PatientContext | null
): string {
  const greeting = patient
    ? `Welcome back ${patient.full_name.split(" ")[0]} 👋`
    : `Hi 👋\nWelcome to ${clinicName}.`;

  const lastVisitLine = patient?.last_visit_at
    ? `\nLast visit: ${new Date(patient.last_visit_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
      })}`
    : "";

  return (
    `${greeting}${lastVisitLine}\n\n` +
    `How can we help today?\n\n` +
    `1️⃣ Book Appointment\n` +
    `2️⃣ Reschedule\n` +
    `3️⃣ Ask a Question\n` +
    `4️⃣ View Reports\n` +
    `5️⃣ Contact Reception\n\n` +
    `Reply with a number (1–5) or type your choice.`
  );
}

export function formatDepartmentList(departments: DepartmentOption[]): string {
  const lines = departments.map((d) => `${d.index}. ${d.name}`);
  return (
    `Choose a department:\n\n${lines.join("\n")}\n\n` +
    `Reply with the department number.`
  );
}

export function formatDoctorList(doctors: DoctorOption[], departmentName: string): string {
  const lines = doctors.map(
    (d) => `${d.index}. Dr. ${d.name}${d.specialization ? ` — ${d.specialization}` : ""}`
  );
  return (
    `Doctors in ${departmentName}:\n\n${lines.join("\n")}\n\n` +
    `Reply with the doctor number.`
  );
}

export function formatDateList(dates: { date: string; label: string; index: number }[]): string {
  const lines = dates.map((d) => `${d.index}. ${d.label}`);
  return `Pick a date:\n\n${lines.join("\n")}\n\nOr type a date like "15 July" or "tomorrow".`;
}

export function formatSlotList(slots: string[], dateLabel: string): string {
  const lines = slots.slice(0, 10).map((slot, i) => `${i + 1}. ${formatTime(slot)}`);
  return (
    `Available slots on ${dateLabel}:\n\n${lines.join("\n")}\n\n` +
    `Reply with the slot number or time (e.g. 10:30 AM).`
  );
}

export function formatReceptionInfo(
  clinicName: string,
  phone: string | null,
  hours?: string
): string {
  const phoneLine = phone ? `\n📞 ${phone}` : "";
  const hoursLine = hours ? `\n🕐 ${hours}` : "";
  return (
    `${clinicName} — Reception${phoneLine}${hoursLine}\n\n` +
    `Our team will assist you during clinic hours. You can also reply MENU anytime to see options.`
  );
}

export function formatReportsInfo(clinicName: string, portalUrl?: string): string {
  const portalLine = portalUrl
    ? `\n\nView online: ${portalUrl}`
    : "\n\nPlease visit the clinic or contact reception for your reports.";
  return (
    `📋 Reports — ${clinicName}${portalLine}\n\n` +
    `Reply MENU for more options.`
  );
}

export function formatAskPrompt(): string {
  return (
    `Please type your question and our team will get back to you shortly.\n\n` +
    `(You can also call reception during clinic hours.)`
  );
}

export function formatAskAck(): string {
  return (
    `Thank you! We've received your question. A team member will reply on WhatsApp soon.\n\n` +
    `Reply MENU for other options.`
  );
}

export function formatBookingConfirmed(
  patientName: string,
  date: string,
  time: string,
  doctorName: string,
  reason: string
): string {
  const dateLabel = new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return (
    `✅ Appointment confirmed!\n\n` +
    `Hi ${patientName.split(" ")[0]}, your visit is booked.\n\n` +
    `📅 ${dateLabel} at ${formatTime(time)}\n` +
    `👨‍⚕️ Dr. ${doctorName}\n` +
    `📝 ${reason}\n\n` +
    `Booked via WhatsApp · appears in clinic dashboard instantly.\n` +
    `Reply MENU for more options.`
  );
}

export function formatReschedulePrompt(
  date: string,
  time: string
): string {
  return (
    `Your upcoming appointment is on ${date} at ${formatTime(time)}.\n\n` +
    `Let's pick a new date. Reply with a date like "tomorrow" or "15 July".`
  );
}

export function formatNoUpcoming(): string {
  return `You don't have an upcoming appointment. Reply 1 or BOOK to schedule a new visit.`;
}

const MENU_MAP: Record<string, ConciergeFlow> = {
  "1": "book",
  "1️⃣": "book",
  book: "book",
  booking: "book",
  appointment: "book",
  "book appointment": "book",
  "2": "reschedule",
  "2️⃣": "reschedule",
  reschedule: "reschedule",
  "3": "ask",
  "3️⃣": "ask",
  ask: "ask",
  question: "ask",
  "ask a question": "ask",
  "4": "reports",
  "4️⃣": "reports",
  reports: "reports",
  report: "reports",
  "view reports": "reports",
  "5": "reception",
  "5️⃣": "reception",
  reception: "reception",
  contact: "reception",
  "contact reception": "reception",
};

export function parseMenuChoice(message: string): ConciergeFlow | null {
  const normalized = message.trim().toLowerCase().replace(/[^\w\s]/g, "").trim();
  if (MENU_MAP[normalized]) return MENU_MAP[normalized];

  const digit = message.trim().match(/^([1-5])/);
  if (digit) return MENU_MAP[digit[1]] ?? null;

  return null;
}

const BOOK_INTENT_PATTERNS = [
  /^book\b/i,
  /book\s+(?:an?\s+)?appointment/i,
  /want\s+to\s+book/i,
  /schedule\s+(?:an?\s+)?(?:appointment|visit)/i,
  /need\s+(?:an?\s+)?appointment/i,
  /come\s+(?:for\s+)?(?:a\s+)?visit/i,
  /want\s+to\s+(?:come|visit)/i,
  /make\s+an?\s+appointment/i,
];

export function isBookingIntent(message: string): boolean {
  const text = message.trim();
  if (parseMenuChoice(text) === "book") return true;
  return BOOK_INTENT_PATTERNS.some((p) => p.test(text));
}

export function isMenuTrigger(message: string): boolean {
  return /^(hi|hello|hey|start|menu|help)$/i.test(message.trim());
}

export function parseNumberChoice(message: string, max: number): number | null {
  const trimmed = message.trim();
  const digitMatch = trimmed.match(/^(\d+)/);
  if (digitMatch) {
    const n = parseInt(digitMatch[1], 10);
    if (n >= 1 && n <= max) return n;
  }
  return null;
}
