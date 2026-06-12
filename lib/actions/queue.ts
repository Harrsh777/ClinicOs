"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

export async function updateCurrentTokenAction(sessionId: string, tokenNumber: number) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("queue_sessions")
    .update({ current_token: tokenNumber })
    .eq("id", sessionId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };
  revalidatePath("/receptionist/queue");
  return { success: true };
}

export async function updateTokenStatusAction(
  tokenId: string,
  status: "called" | "serving" | "completed" | "skipped"
) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const update: Record<string, unknown> = { status };
  if (status === "called") update.called_at = new Date().toISOString();
  if (status === "serving") update.serving_at = new Date().toISOString();
  if (status === "completed") update.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("queue_tokens")
    .update(update)
    .eq("id", tokenId)
    .select("*, patients(user_id, full_name)")
    .single();

  if (error) return { error: error.message };

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

  revalidatePath("/receptionist/queue");
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

  return updateTokenStatusAction(sorted[0].id, "called");
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
    .select("id, name, slug")
    .eq("slug", clinicSlug)
    .single();

  if (!clinic) return null;

  const { data: session } = await supabase
    .from("queue_sessions")
    .select("*")
    .eq("clinic_id", clinic.id)
    .eq("session_date", today)
    .maybeSingle();

  if (!session) return { clinic, session: null, tokens: [] };

  const { data: tokens } = await supabase
    .from("queue_tokens")
    .select("token_number, status, priority, called_at")
    .eq("session_id", session.id)
    .in("status", ["called", "serving", "completed"])
    .order("token_number", { ascending: false })
    .limit(5);

  return { clinic, session, tokens: tokens ?? [] };
}
