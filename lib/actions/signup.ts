"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { applicationReceivedEmail } from "@/lib/email/templates";
import {
  sendSignupEmailOtp,
  sendSignupMobileOtp,
  verifySignupOtp,
} from "@/lib/auth/signup-otp";
import { applicationSchema } from "@/lib/validations/clinic-application";

export async function sendSignupEmailOtpAction(email: string) {
  return sendSignupEmailOtp(email);
}

export async function sendSignupMobileOtpAction(phone: string) {
  return sendSignupMobileOtp(phone);
}

export async function submitClinicApplicationAction(formData: FormData) {
  const parsed = applicationSchema.safeParse({
    clinicName: formData.get("clinicName"),
    clinicType: formData.get("clinicType"),
    city: formData.get("city"),
    state: formData.get("state"),
    doctorCount: formData.get("doctorCount"),
    phone: formData.get("phone"),
    officialEmail: formData.get("officialEmail"),
    gst: formData.get("gst") || undefined,
    website: formData.get("website") || undefined,
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    ownerMobile: formData.get("ownerMobile"),
    emailOtp: formData.get("emailOtp"),
    mobileOtp: formData.get("mobileOtp"),
    termsAccepted: formData.get("termsAccepted"),
    planSlug: formData.get("planSlug") || "pro",
  });

  if (!parsed.success) {
    return { error: "Please fill all required fields correctly and accept terms" };
  }

  const emailVerify = await verifySignupOtp("email", parsed.data.ownerEmail, parsed.data.emailOtp);
  if ("error" in emailVerify) return { error: `Email verification failed: ${emailVerify.error}` };

  const mobileVerify = await verifySignupOtp("mobile", parsed.data.ownerMobile, parsed.data.mobileOtp);
  if ("error" in mobileVerify) return { error: `Mobile verification failed: ${mobileVerify.error}` };

  const service = await createServiceClient();

  const { data: existing } = await service
    .from("clinic_applications")
    .select("id")
    .eq("owner_email", parsed.data.ownerEmail.toLowerCase())
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "An application with this email is already pending review" };
  }

  const { error } = await service.from("clinic_applications").insert({
    clinic_name: parsed.data.clinicName,
    clinic_type: parsed.data.clinicType,
    doctor_count: parsed.data.doctorCount,
    owner_name: parsed.data.ownerName,
    owner_email: parsed.data.ownerEmail.toLowerCase(),
    owner_mobile: parsed.data.ownerMobile,
    official_email: parsed.data.officialEmail.toLowerCase(),
    phone: parsed.data.phone,
    gst: parsed.data.gst ?? null,
    website: parsed.data.website || null,
    city: parsed.data.city,
    state: parsed.data.state,
    plan_slug: parsed.data.planSlug,
    email_verified: true,
    mobile_verified: true,
    terms_accepted: true,
    status: "pending",
  });

  if (error) return { error: error.message };

  await sendEmail({
    to: parsed.data.ownerEmail,
    subject: "MedERP — Application received (Pending Approval)",
    html: applicationReceivedEmail(parsed.data.clinicName),
  });

  return { success: true };
}

export async function getPublicPlans() {
  const service = await createServiceClient();
  const { data } = await service
    .from("plans")
    .select("slug, name, price_monthly, features")
    .eq("is_active", true)
    .order("price_monthly");
  return data ?? [];
}
