import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "clinicos_portal_session";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface PortalSession {
  phone: string;
  clinicId: string;
  exp: number;
}

function getSecret() {
  return (
    process.env.PORTAL_SESSION_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ??
    "clinicos-portal-dev-secret"
  );
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createPortalSessionToken(phone: string, clinicId: string): string {
  const session: PortalSession = {
    phone: phone.replace(/\D/g, "").slice(-10),
    clinicId,
    exp: Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function parsePortalSessionToken(token: string): PortalSession | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const expected = sign(body);
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const session = JSON.parse(Buffer.from(body, "base64url").toString()) as PortalSession;
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function setPortalSession(phone: string, clinicId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createPortalSessionToken(phone, clinicId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_MS / 1000,
    path: "/",
  });
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return parsePortalSessionToken(token);
}

export async function requirePortalSession(phone: string, clinicId: string) {
  const session = await getPortalSession();
  if (!session) return { error: "Session expired. Please verify your phone again." };
  const normalized = phone.replace(/\D/g, "").slice(-10);
  if (session.phone !== normalized || session.clinicId !== clinicId) {
    return { error: "Phone verification mismatch." };
  }
  return { session };
}
