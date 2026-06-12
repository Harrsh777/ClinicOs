import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  return (
    process.env.VISIT_QR_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ??
    "clinicos-dev-qr-secret-change-in-prod"
  );
}

export function signVisit(visitCode: string): string {
  return createHmac("sha256", getSecret()).update(visitCode).digest("hex").slice(0, 16);
}

export function verifyVisitSignature(visitCode: string, signature: string): boolean {
  const expected = signVisit(visitCode);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export interface SecureQRPayload {
  visitId: string;
  signature: string;
}

export function buildQRPayload(visitCode: string): SecureQRPayload {
  return { visitId: visitCode, signature: signVisit(visitCode) };
}

export function parseQRPayload(raw: string): SecureQRPayload | null {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as SecureQRPayload;
    if (parsed.visitId && parsed.signature) return parsed;
  } catch {
    // URL or plain visit code
  }

  const urlMatch = trimmed.match(/visitId=([^&]+).*signature=([^&]+)/i);
  if (urlMatch) {
    return { visitId: decodeURIComponent(urlMatch[1]), signature: decodeURIComponent(urlMatch[2]) };
  }

  if (/^VIS-\d+$/i.test(trimmed)) {
    return null;
  }

  return null;
}
