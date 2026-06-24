import { createHash, randomInt } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

function generateCode() {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    return "123456";
  }
  return String(randomInt(100000, 999999));
}

async function checkCooldown(channel: string, target: string) {
  const service = await createServiceClient();
  const { data: recent } = await service
    .from("signup_otp_codes")
    .select("created_at")
    .eq("channel", channel)
    .eq("target", target)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent && Date.now() - new Date(recent.created_at).getTime() < OTP_COOLDOWN_MS) {
    return { error: "Please wait a minute before requesting another code." };
  }
  return null;
}

export async function sendSignupEmailOtp(email: string) {
  const target = email.toLowerCase().trim();
  const cooldown = await checkCooldown("email", target);
  if (cooldown) return cooldown;

  const code = generateCode();
  const service = await createServiceClient();

  const { error } = await service.from("signup_otp_codes").insert({
    channel: "email",
    target,
    code_hash: hashCode(code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });

  if (error) return { error: "Could not send verification code." };

  await sendEmail({
    to: target,
    subject: "ClinicOS — Email verification code",
    html: `<p>Your verification code is <strong>${code}</strong>. Valid for 10 minutes.</p>`,
  });

  return { success: true, devCode: process.env.NODE_ENV === "development" ? code : undefined };
}

export async function sendSignupMobileOtp(phone: string) {
  const target = normalizePhone(phone);
  if (target.length !== 10) return { error: "Enter a valid 10-digit mobile number" };

  const cooldown = await checkCooldown("mobile", target);
  if (cooldown) return cooldown;

  const code = generateCode();
  const service = await createServiceClient();

  const { error } = await service.from("signup_otp_codes").insert({
    channel: "mobile",
    target,
    code_hash: hashCode(code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });

  if (error) return { error: "Could not send verification code." };

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
            To: `+91${target}`,
            From: process.env.TWILIO_PHONE_NUMBER,
            Body: `Your ClinicOS verification code is ${code}. Valid for 10 minutes.`,
          }),
        }
      );
    } catch {
      return { error: "SMS delivery failed. Try again." };
    }
  }

  return { success: true, devCode: process.env.NODE_ENV === "development" ? code : undefined };
}

export async function verifySignupOtp(channel: "email" | "mobile", target: string, code: string) {
  const normalized = channel === "email" ? target.toLowerCase().trim() : normalizePhone(target);
  const service = await createServiceClient();

  const { data: record } = await service
    .from("signup_otp_codes")
    .select("*")
    .eq("channel", channel)
    .eq("target", normalized)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record) return { error: "No verification code found. Request a new one." };
  if (new Date(record.expires_at) < new Date()) return { error: "Code expired. Request a new one." };
  if (record.attempts >= MAX_ATTEMPTS) return { error: "Too many attempts. Request a new code." };

  if (hashCode(code) !== record.code_hash) {
    await service
      .from("signup_otp_codes")
      .update({ attempts: record.attempts + 1 })
      .eq("id", record.id);
    return { error: "Invalid code. Try again." };
  }

  await service
    .from("signup_otp_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", record.id);

  return { success: true };
}
