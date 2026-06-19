"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { applicationReceivedEmail } from "@/lib/email/templates";
import { z } from "zod";

const applicationSchema = z.object({
  clinicName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(80),
  ownerEmail: z.string().email(),
  phone: z.string().min(10).max(15),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(60),
  state: z.string().min(2).max(60),
  pincode: z.string().min(6).max(6),
  planSlug: z.enum(["free", "pro", "enterprise"]).default("pro"),
});

export async function submitClinicApplicationAction(formData: FormData) {
  const parsed = applicationSchema.safeParse({
    clinicName: formData.get("clinicName"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    planSlug: formData.get("planSlug") || "pro",
  });

  if (!parsed.success) {
    return { error: "Please fill all required fields correctly" };
  }

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
    owner_name: parsed.data.ownerName,
    owner_email: parsed.data.ownerEmail.toLowerCase(),
    phone: parsed.data.phone,
    address: parsed.data.address,
    city: parsed.data.city,
    state: parsed.data.state,
    pincode: parsed.data.pincode,
    plan_slug: parsed.data.planSlug,
    status: "pending",
  });

  if (error) return { error: error.message };

  await sendEmail({
    to: parsed.data.ownerEmail,
    subject: "ClinicOS — Application received",
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
