import { createHash, randomInt } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function sendPortalOtp(clinicId: string, phone: string) {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return { error: "Enter a valid 10-digit mobile number" };

  const service = await createServiceClient();

  const { data: recent } = await service
    .from("portal_otp_codes")
    .select("created_at")
    .eq("phone", normalized)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent && Date.now() - new Date(recent.created_at).getTime() < OTP_COOLDOWN_MS) {
    return { error: "Please wait a minute before requesting another OTP." };
  }

  const code =
    process.env.NODE_ENV === "development" && !process.env.TWILIO_ACCOUNT_SID
      ? "123456"
      : String(randomInt(100000, 999999));

  const { error } = await service.from("portal_otp_codes").insert({
    phone: normalized,
    clinic_id: clinicId,
    code_hash: hashCode(code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });

  if (error) return { error: "Could not send OTP. Try again." };

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString("base64");
      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: `+91${normalized}`,
            From: process.env.TWILIO_PHONE_NUMBER,
            Body: `Your ClinicOS verification code is ${code}. Valid for 10 minutes.`,
          }),
        }
      );
    } catch {
      return { error: "SMS delivery failed. Try again." };
    }
  }

  return {
    success: true,
    devCode: process.env.NODE_ENV === "development" ? code : undefined,
  };
}

export async function verifyPortalOtp(clinicId: string, phone: string, code: string) {
  const normalized = normalizePhone(phone);
  const service = await createServiceClient();

  const { data: record } = await service
    .from("portal_otp_codes")
    .select("*")
    .eq("phone", normalized)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record) return { error: "No OTP found. Request a new code." };
  if (new Date(record.expires_at) < new Date()) return { error: "OTP expired. Request a new code." };
  if (record.attempts >= MAX_ATTEMPTS) return { error: "Too many attempts. Request a new code." };

  if (hashCode(code) !== record.code_hash) {
    await service
      .from("portal_otp_codes")
      .update({ attempts: record.attempts + 1 })
      .eq("id", record.id);
    return { error: "Invalid OTP. Try again." };
  }

  return { success: true, phone: normalized };
}
