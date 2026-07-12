/** Strip HTML tags and trim user-provided text for safe storage */
export function sanitizeText(input: string | undefined | null, maxLength = 5000): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export function sanitizeEmail(email: string | undefined | null): string | null {
  if (!email?.trim()) return null;
  const cleaned = email.trim().toLowerCase().slice(0, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : null;
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
