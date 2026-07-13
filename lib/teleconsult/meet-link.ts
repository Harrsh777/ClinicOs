const GOOGLE_MEET_PATTERN =
  /^https?:\/\/(meet\.google\.com\/[a-z0-9-]+|meet\.google\.com\/lookup\/[a-z0-9]+)/i;

export function normalizeMeetUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith("meet.google.com")) {
      url = `https://${url}`;
    } else {
      return null;
    }
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "meet.google.com") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isValidGoogleMeetUrl(url: string): boolean {
  const normalized = normalizeMeetUrl(url);
  if (!normalized) return false;
  return GOOGLE_MEET_PATTERN.test(normalized);
}

export function buildTeleconsultMeetMessage(params: {
  patientName: string;
  doctorName: string;
  clinicName: string;
  appointmentDate: string;
  appointmentTime: string;
  meetUrl: string;
}): string {
  const dateLabel = formatAppointmentDate(params.appointmentDate);
  const timeLabel = formatAppointmentTime(params.appointmentTime);

  return [
    `Hello ${params.patientName},`,
    "",
    `Your video consultation with Dr. ${params.doctorName} at ${params.clinicName} is scheduled for ${dateLabel} at ${timeLabel}.`,
    "",
    "Join your consultation here:",
    params.meetUrl,
    "",
    "Please join a few minutes before your scheduled time.",
    "",
    `— ${params.clinicName}`,
  ].join("\n");
}

function formatAppointmentDate(date: string): string {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function formatAppointmentTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}
