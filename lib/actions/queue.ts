"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/auth/audit";

const QUEUE_PATHS = ["/receptionist/queue", "/owner/queue", "/doctor/queue", "/nurse/queue"];

function revalidateQueuePaths() {
  for (const p of QUEUE_PATHS) revalidatePath(p);
}

async function logQueue(profile: { clinic_id: string | null; id: string }, action: string, entityId?: string, metadata?: Record<string, unknown>) {
  if (!profile.clinic_id) return;
  await logAuditEvent({
    clinicId: profile.clinic_id,
    actorId: profile.id,
    action,
    entityType: "queue",
    entityId,
    metadata,
  });
}

export async function updateCurrentTokenAction(sessionId: string, tokenNumber: number) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("queue_sessions")
    .update({ current_token: tokenNumber })
    .eq("id", sessionId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };
  await logQueue(profile, "current_token_updated", sessionId, { tokenNumber });
  revalidateQueuePaths();
  return { success: true };
}

function nowIso() {
  return new Date().toISOString();
}

export async function updateTokenStatusAction(
  tokenId: string,
  status: "called" | "serving" | "completed" | "skipped" | "no_show" | "cancelled"
) {
  const profile = await requireAuth();
  const supabase = await createClient();
  const now = nowIso();

  const update: Record<string, unknown> = { status, status_updated_at: now, updated_at: now };
  if (status === "called") {
    update.called_at = now;
    update.journey_stage = "called";
  }
  if (status === "serving") {
    update.serving_at = now;
    update.consultation_started_at = now;
    update.journey_stage = "consultation_started";
  }
  if (status === "completed") {
    update.completed_at = now;
    update.consultation_completed_at = now;
    update.journey_stage = "consultation_completed";
  }
  if (status === "no_show") update.journey_stage = "no_show";
  if (status === "cancelled") update.journey_stage = "cancelled";

  const { data, error } = await supabase
    .from("queue_tokens")
    .update(update)
    .eq("id", tokenId)
    .select("*, patients(user_id, full_name)")
    .single();

  if (error) return { error: error.message };

  if (status === "called" && data) {
    await supabase
      .from("queue_sessions")
      .update({ current_token: data.token_number })
      .eq("id", data.session_id);
  }

  if (status === "serving" && data?.doctor_id) {
    await supabase
      .from("doctors")
      .update({ queue_status: "consulting" })
      .eq("id", data.doctor_id);
  }

  if (status === "completed" && data?.doctor_id) {
    await supabase
      .from("doctors")
      .update({ queue_status: "available" })
      .eq("id", data.doctor_id);
  }

  const patient = data?.patients as { user_id: string | null; full_name: string } | null;
  if (status === "called" && patient?.user_id) {
    await supabase.from("notifications").insert({
      user_id: patient.user_id,
      clinic_id: profile.clinic_id,
      title: "Your Turn is Coming!",
      body: `Token ${(data as { token_label?: string }).token_label ?? `#${data.token_number}`} — please proceed to the consultation room.`,
      type: "queue",
      metadata: { token_number: data.token_number },
    });
  }

  await logQueue(profile, `token_${status}`, tokenId, { token_number: data?.token_number });
  revalidateQueuePaths();
  return { success: true };
}

export async function callNextTokenAction(sessionId: string) {
  const supabase = await createClient();

  const { data: tokens } = await supabase
    .from("queue_tokens")
    .select("*")
    .eq("session_id", sessionId)
    .eq("status", "waiting")
    .order("priority", { ascending: false })
    .order("token_number");

  if (!tokens?.length) return { error: "No waiting tokens" };

  const priorityOrder = { emergency: 0, vip: 1, normal: 2 };
  const sorted = [...tokens].sort((a, b) => {
    const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
    if (pa !== pb) return pa - pb;
    return a.token_number - b.token_number;
  });

  const result = await updateTokenStatusAction(sorted[0].id, "called");
  if (result.success && sorted[0]) {
    const profile = await requireAuth();
    const supabase = await createClient();
    await supabase
      .from("queue_sessions")
      .update({ current_token: sorted[0].token_number })
      .eq("id", sessionId);
    await logQueue(profile, "call_next", sorted[0].id, { token_number: sorted[0].token_number });
  }
  return result;
}

export async function qrCheckInAction(clinicSlug: string, patientId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id")
    .eq("slug", clinicSlug)
    .eq("status", "active")
    .single();

  if (!clinic) return { error: "Clinic not found" };

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, doctor_id")
    .eq("patient_id", patientId)
    .eq("clinic_id", clinic.id)
    .eq("appointment_date", today)
    .in("status", ["confirmed", "pending"])
    .maybeSingle();

  const { generateQueueToken } = await import("@/lib/actions/appointments");
  const priority = appointment ? "normal" : "normal";

  const result = await generateQueueToken(
    clinic.id,
    patientId,
    appointment?.id,
    appointment?.doctor_id,
    priority
  );

  if (appointment) {
    await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", appointment.id);
  }

  return result;
}

export async function getQueueBySlug(clinicSlug: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, slug, settings, consultation_fee_default, daily_patient_capacity")
    .eq("slug", clinicSlug)
    .single();

  if (!clinic) return null;

  const { data: session } = await supabase
    .from("queue_sessions")
    .select("*")
    .eq("clinic_id", clinic.id)
    .eq("session_date", today)
    .maybeSingle();

  if (!session) return { clinic, session: null, tokens: [], serving: null, nextTokens: [], estimatedWaitMins: 0 };

  const { data: tokens } = await supabase
    .from("queue_tokens")
    .select("id, token_number, token_label, status, priority, doctor_id, doctors(room_number, profiles(full_name))")
    .eq("session_id", session.id)
    .order("sort_order", { ascending: true });

  const serving = (tokens ?? []).find((t) => t.status === "serving" || t.status === "called");
  const waiting = (tokens ?? []).filter((t) => t.status === "waiting");
  const priorityOrder = { emergency: 0, vip: 1, normal: 2 };
  const sortedWaiting = [...waiting].sort((a, b) => {
    const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
    if (pa !== pb) return pa - pb;
    return a.token_number - b.token_number;
  });

  const estimatedWaitMins = sortedWaiting.length * (session.avg_consultation_mins ?? 15);

  return {
    clinic,
    session,
    tokens: tokens ?? [],
    serving,
    nextTokens: sortedWaiting.slice(0, 5),
    estimatedWaitMins,
  };
}
