"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  demoRequestFieldErrors,
  demoRequestSchema,
  getMaxDemoDate,
  getMinDemoDate,
} from "@/lib/validations/demo-request";
import type { DemoRequest, DemoRequestStatus } from "@/lib/types/database";

async function captureRequestMetadata() {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    null;

  return {
    ip_address: ip,
    user_agent: headerStore.get("user-agent"),
    referer: headerStore.get("referer"),
    accept_language: headerStore.get("accept-language"),
  };
}

export async function submitDemoRequestAction(formData: FormData) {
  const parsed = demoRequestSchema.safeParse({
    clinicName: formData.get("clinicName"),
    doctorName: formData.get("doctorName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: String(formData.get("phone") ?? "").replace(/\D/g, "").slice(-10),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    clinicType: formData.get("clinicType"),
    preferredDate: formData.get("preferredDate"),
    preferredTime: formData.get("preferredTime"),
    notes: formData.get("notes"),
    clientTimezone: formData.get("clientTimezone"),
    screenResolution: formData.get("screenResolution"),
  });

  if (!parsed.success) {
    return { error: "Please fix the highlighted fields", fieldErrors: demoRequestFieldErrors(parsed.error) };
  }

  const minDate = getMinDemoDate();
  const maxDate = getMaxDemoDate();
  if (parsed.data.preferredDate < minDate || parsed.data.preferredDate > maxDate) {
    return { error: "Please choose a demo date within the next 30 days" };
  }

  const meta = await captureRequestMetadata();
  const rl = await enforceRateLimit("demo-request", meta.ip_address ?? "unknown", 5, 3600);
  if (!rl.allowed) {
    return { error: "Too many demo requests. Please try again later." };
  }

  const service = await createServiceClient();
  const email = parsed.data.email.toLowerCase();

  const { data: recent } = await service
    .from("demo_requests")
    .select("id")
    .eq("email", email)
    .eq("status", "new")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle();

  if (recent) {
    return { error: "You already have a pending demo request. Our team will contact you shortly." };
  }

  const { error } = await service.from("demo_requests").insert({
    clinic_name: parsed.data.clinicName,
    doctor_name: parsed.data.doctorName,
    contact_name: parsed.data.contactName,
    email,
    phone: parsed.data.phone,
    address: parsed.data.address || null,
    city: parsed.data.city,
    state: parsed.data.state,
    pincode: parsed.data.pincode || null,
    clinic_type: parsed.data.clinicType || null,
    preferred_date: parsed.data.preferredDate,
    preferred_time: parsed.data.preferredTime,
    notes: parsed.data.notes || null,
    ip_address: meta.ip_address,
    user_agent: meta.user_agent,
    referer: meta.referer,
    accept_language: meta.accept_language,
    client_metadata: {
      timezone: parsed.data.clientTimezone || null,
      screen_resolution: parsed.data.screenResolution || null,
      submitted_at_client: new Date().toISOString(),
    },
    status: "new",
  });

  if (error) {
    if (error.message.includes("demo_requests") && error.message.includes("does not exist")) {
      return { error: "Demo booking is not configured yet. Please contact support." };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function getDemoRequests(status?: DemoRequestStatus) {
  await requirePlatformAdmin();
  const service = await createServiceClient();

  let query = service
    .from("demo_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error?.message.includes("demo_requests")) return [];
  if (error) throw new Error(error.message);
  return (data ?? []) as DemoRequest[];
}

const updateDemoSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "scheduled", "closed", "cancelled"]),
  adminNotes: z.string().max(2000).optional(),
});

export async function updateDemoRequestAction(formData: FormData) {
  await requirePlatformAdmin();
  const parsed = updateDemoSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes") ?? undefined,
  });

  if (!parsed.success) return { error: "Invalid request" };

  const service = await createServiceClient();
  const { error } = await service
    .from("demo_requests")
    .update({
      status: parsed.data.status,
      admin_notes: parsed.data.adminNotes?.trim() || null,
      reviewed_by: null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/demo-requests");
  return { success: true };
}

export async function getDemoRequestStats() {
  await requirePlatformAdmin();
  const service = await createServiceClient();

  const [{ count: newCount, error: countError }, { data: recent, error: recentError }] = await Promise.all([
    service.from("demo_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
    service
      .from("demo_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (countError?.message.includes("demo_requests") || recentError?.message.includes("demo_requests")) {
    return { newCount: 0, recent: [] as DemoRequest[] };
  }

  if (countError) throw new Error(countError.message);
  if (recentError) throw new Error(recentError.message);

  return {
    newCount: newCount ?? 0,
    recent: (recent ?? []) as DemoRequest[],
  };
}
