const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export function normalizeIndianPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function isValidIndianPhone(input: string): boolean {
  return INDIAN_MOBILE.test(normalizeIndianPhone(input));
}

export function validateIndianPhone(input: string): { phone: string } | { error: string } {
  const phone = normalizeIndianPhone(input);
  if (!INDIAN_MOBILE.test(phone)) {
    return { error: "Enter a valid 10-digit Indian mobile number (starts with 6–9)" };
  }
  return { phone };
}

export function ageToApproxDateOfBirth(ageYears: number): string {
  const year = new Date().getFullYear() - ageYears;
  return `${year}-01-01`;
}
