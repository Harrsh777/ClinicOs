"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { applicationReceivedEmail } from "@/lib/email/templates";
import {
  clinicRegistrationSchema,
  registrationFieldErrors,
} from "@/lib/validations/clinic-registration";

export async function submitClinicRegistrationAction(formData: FormData) {
  const parsed = clinicRegistrationSchema.safeParse({
    clinicName: formData.get("clinicName"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    state: formData.get("state"),
    clinicType: formData.get("clinicType"),
    doctorCount: formData.get("doctorCount") || "",
  });

  if (!parsed.success) {
    return { error: "Please fill all required fields correctly", fieldErrors: registrationFieldErrors(parsed.error) };
  }

  const service = await createServiceClient();
  const email = parsed.data.email.toLowerCase();

  const { data: existing } = await service
    .from("clinic_applications")
    .select("id")
    .eq("owner_email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "An application with this email is already pending review" };
  }

  const { error } = await service.from("clinic_applications").insert({
    clinic_name: parsed.data.clinicName,
    owner_name: parsed.data.ownerName,
    owner_email: email,
    owner_mobile: parsed.data.phone,
    phone: parsed.data.phone,
    city: parsed.data.city,
    state: parsed.data.state,
    clinic_type: parsed.data.clinicType,
    doctor_count: parsed.data.doctorCount,
    status: "pending",
    plan_slug: "pro",
    email_verified: false,
    mobile_verified: false,
    terms_accepted: true,
  });

  if (error) return { error: error.message };

  await sendEmail({
    to: email,
    subject: "ClinicOS — Application received (Pending Approval)",
    html: applicationReceivedEmail(parsed.data.clinicName),
  });

  return { success: true };
}
