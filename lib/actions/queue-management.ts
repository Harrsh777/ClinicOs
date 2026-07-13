"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/auth/audit";
import type { DoctorQueueStatus, QueueJourneyStage } from "@/lib/queue/types";

const QUEUE_PATHS = ["/owner/queue", "/owner/my-queue", "/receptionist/queue", "/doctor/queue", "/nurse/queue"];

function revalidateQueue() {
  for (const p of QUEUE_PATHS) revalidatePath(p);
  revalidatePath("/queue", "layout");
}

function nowIso() {
  return new Date().toISOString();
}

async function logQueueAction(
  clinicId: string,
  actorId: string,
  action: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await logAuditEvent({
    clinicId,
    actorId,
    action,
    entityType: "queue",
    entityId,
    metadata,
  });
}

async function patchToken(
  tokenId: string,
  clinicId: string,
  patch: Record<string, unknown>,
  journeyStage?: QueueJourneyStage
) {
  const supabase = await createClient();
  const now = nowIso();
  const update: Record<string, unknown> = {
    ...patch,
    status_updated_at: now,
    updated_at: now,
  };
  if (journeyStage) update.journey_stage = journeyStage;

  const { data, error } = await supabase
    .from("queue_tokens")
    .update(update)
    .eq("id", tokenId)
    .eq("clinic_id", clinicId)
    .select("token_number, session_id, doctor_id")
    .single();

  return { data, error };
}

async function detectReturningPatient(supabase: Awaited<ReturnType<typeof createClient>>, patientId: string, clinicId: string) {
  const { count } = await supabase
    .from("clinic_visits")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("clinic_id", clinicId);
  return (count ?? 0) > 0;
}

export async function getLiveQueueContext(clinicId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: clinic }, { data: session }, { data: doctors }] = await Promise.all([
    supabase.from("clinics").select("settings, consultation_fee_default, daily_patient_capacity").eq("id", clinicId).single(),
    supabase
      .from("queue_sessions")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("session_date", today)
      .maybeSingle(),
    supabase
      .from("doctors")
      .select("id, profile_id, specialization, department, room_number, queue_status, queue_paused, avg_consultation_mins, slot_duration_mins, profiles(full_name)")
      .eq("clinic_id", clinicId),
  ]);

  const settings = (clinic?.settings ?? {}) as Record<string, unknown>;
  const queueSettings = (settings.queue ?? {}) as Record<string, unknown>;

  let tokens: unknown[] = [];
  if (session) {
    const { data } = await supabase
      .from("queue_tokens")
      .select(
        "*, patients(full_name, phone, date_of_birth, gender), appointments(appointment_time, notes), doctors(specialization, department, room_number, profiles(full_name))"
      )
      .eq("session_id", session.id)
      .order("sort_order", { ascending: true, nullsFirst: false });
    tokens = data ?? [];
  }

  const { data: todayConsults } = await supabase
    .from("consultations")
    .select("doctor_id, started_at, ended_at")
    .eq("clinic_id", clinicId)
    .gte("started_at", `${today}T00:00:00`)
    .not("ended_at", "is", null);

  const durationsByDoctor = new Map<string, number[]>();
  for (const c of todayConsults ?? []) {
    if (!c.started_at || !c.ended_at || !c.doctor_id) continue;
    const mins = Math.round(
      (new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()) / 60000
    );
    const list = durationsByDoctor.get(c.doctor_id) ?? [];
    list.push(mins);
    durationsByDoctor.set(c.doctor_id, list);
  }

  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("id, action, created_at, metadata, profiles:actor_id(full_name)")
    .eq("clinic_id", clinicId)
    .eq("entity_type", "queue")
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    session,
    tokens,
    doctors: doctors ?? [],
    clinicSettings: {
      dailyPatientCapacity:
        Number(clinic?.daily_patient_capacity) ||
        Number(queueSettings.dailyPatientCapacity) ||
        50,
      avgFeePerPatient:
        Number(queueSettings.avgFeePerPatient) ||
        Number(clinic?.consultation_fee_default) ||
        500,
    },
    durationsByDoctor: Object.fromEntries(durationsByDoctor),
    auditLogs: auditLogs ?? [],
  };
}

export async function updateDoctorQueueStatusAction(
  doctorId: string,
  status: DoctorQueueStatus,
  options?: { override?: boolean }
) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic" };

  const isOwner = profile.role === "clinic_owner" || profile.role === "administrator";
  const isDoctor = profile.role === "doctor";

  if (!isOwner && !isDoctor && profile.role !== "receptionist") {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, profile_id, clinic_id")
    .eq("id", doctorId)
    .eq("clinic_id", profile.clinic_id)
    .single();

  if (!doctor) return { error: "Doctor not found" };
  if (isDoctor && doctor.profile_id !== profile.id && !options?.override) {
    return { error: "You can only update your own status" };
  }

  const update: Record<string, unknown> = { queue_status: status };
  if (status === "break") update.queue_paused = true;
  if (status === "available" || status === "consulting") update.queue_paused = false;

  const { error } = await supabase.from("doctors").update(update).eq("id", doctorId);
  if (error) return { error: error.message };

  await logQueueAction(profile.clinic_id, profile.id, `doctor_status_${status}`, doctorId, {
    status,
    override: options?.override ?? false,
  });

  revalidateQueue();
  return { success: true };
}

export async function pauseDoctorQueueAction(doctorId: string, paused: boolean) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic" };

  const supabase = await createClient();
  const update = {
    queue_paused: paused,
    queue_status: paused ? "break" : "available",
  };

  const { error } = await supabase
    .from("doctors")
    .update(update)
    .eq("id", doctorId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };

  await logQueueAction(
    profile.clinic_id,
    profile.id,
    paused ? "queue_paused" : "queue_resumed",
    doctorId
  );

  revalidateQueue();
  return { success: true };
}

export async function reorderQueueTokenAction(tokenId: string, direction: "up" | "down") {
  const profile = await requireRole(["receptionist", "clinic_owner", "nurse"]);
  const supabase = await createClient();

  const { data: token } = await supabase
    .from("queue_tokens")
    .select("*, queue_sessions!inner(id, clinic_id)")
    .eq("id", tokenId)
    .eq("clinic_id", profile.clinic_id!)
    .single();

  if (!token || token.status !== "waiting") return { error: "Token not in waiting queue" };

  const { data: siblings } = await supabase
    .from("queue_tokens")
    .select("id, sort_order, priority, token_number, version")
    .eq("session_id", token.session_id)
    .eq("status", "waiting")
    .order("sort_order");

  const sorted = [...(siblings ?? [])].sort((a, b) => {
    const priorityOrder = { emergency: 0, vip: 1, normal: 2 };
    const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
    if (pa !== pb) return pa - pb;
    return (a.sort_order ?? a.token_number) - (b.sort_order ?? b.token_number);
  });

  const idx = sorted.findIndex((t) => t.id === tokenId);
  if (idx < 0) return { error: "Token not found in queue" };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return { error: "Cannot move further" };

  const current = sorted[idx];
  const target = sorted[swapIdx];

  const currentOrder = current.sort_order ?? current.token_number;
  const targetOrder = target.sort_order ?? target.token_number;

  await Promise.all([
    supabase
      .from("queue_tokens")
      .update({ sort_order: targetOrder, version: (current.version ?? 1) + 1 })
      .eq("id", current.id)
      .eq("version", current.version ?? 1),
    supabase
      .from("queue_tokens")
      .update({ sort_order: currentOrder, version: (target.version ?? 1) + 1 })
      .eq("id", target.id)
      .eq("version", target.version ?? 1),
  ]);

  await logQueueAction(profile.clinic_id!, profile.id, `queue_reorder_${direction}`, tokenId, {
    from: currentOrder,
    to: targetOrder,
  });

  revalidateQueue();
  return { success: true };
}

export async function assignTokenDoctorAction(tokenId: string, doctorId: string) {
  const profile = await requireRole(["receptionist", "clinic_owner", "nurse"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("queue_tokens")
    .update({ doctor_id: doctorId })
    .eq("id", tokenId)
    .eq("clinic_id", profile.clinic_id!);

  if (error) return { error: error.message };

  await logQueueAction(profile.clinic_id!, profile.id, "assign_doctor", tokenId, { doctorId });
  revalidateQueue();
  return { success: true };
}

export async function insertEmergencyTokenAction(tokenId: string) {
  const profile = await requireRole(["receptionist", "clinic_owner", "doctor", "nurse"]);
  const supabase = await createClient();

  const { data: token } = await supabase
    .from("queue_tokens")
    .select("id, session_id, sort_order, token_number, version")
    .eq("id", tokenId)
    .eq("clinic_id", profile.clinic_id!)
    .single();

  if (!token) return { error: "Token not found" };

  const { data: waiting } = await supabase
    .from("queue_tokens")
    .select("sort_order, token_number")
    .eq("session_id", token.session_id)
    .eq("status", "waiting")
    .order("sort_order");

  const minOrder =
    waiting?.length
      ? Math.min(...waiting.map((t) => t.sort_order ?? t.token_number)) - 1
      : 0;

  const { error } = await supabase
    .from("queue_tokens")
    .update({
      priority: "emergency",
      token_series: "emergency",
      sort_order: minOrder,
      version: (token.version ?? 1) + 1,
    })
    .eq("id", tokenId);

  if (error) return { error: error.message };

  await logQueueAction(profile.clinic_id!, profile.id, "emergency_inserted", tokenId);
  revalidateQueue();
  return { success: true, banner: "Emergency case inserted — queue recalculated" };
}

export async function checkInPatientAction(tokenId: string) {
  const profile = await requireRole(["receptionist", "clinic_owner", "nurse"]);
  const supabase = await createClient();
  const now = nowIso();

  const { data: token } = await supabase
    .from("queue_tokens")
    .select("patient_id")
    .eq("id", tokenId)
    .eq("clinic_id", profile.clinic_id!)
    .single();

  if (!token) return { error: "Token not found" };

  const isReturning = await detectReturningPatient(supabase, token.patient_id, profile.clinic_id!);

  const { error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    {
      checked_in_at: now,
      status: "waiting",
      is_returning_patient: isReturning,
      patient_type: isReturning ? "returning" : undefined,
    },
    "checked_in"
  );

  if (error) return { error: error.message };
  await logQueueAction(profile.clinic_id!, profile.id, "patient_checked_in", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function markPatientArrivedAction(tokenId: string) {
  const profile = await requireRole(["receptionist", "clinic_owner", "nurse"]);
  const now = nowIso();

  const { error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    { arrived_at: now, journey_stage: "waiting" },
    "waiting"
  );

  if (error) return { error: error.message };
  await logQueueAction(profile.clinic_id!, profile.id, "patient_arrived", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function callPatientAction(tokenId: string) {
  const profile = await requireAuth();
  const supabase = await createClient();
  const now = nowIso();

  const { data, error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    { status: "called", called_at: now },
    "called"
  );

  if (error) return { error: error.message };

  if (data) {
    await supabase
      .from("queue_sessions")
      .update({ current_token: data.token_number })
      .eq("id", data.session_id);
  }

  await logQueueAction(profile.clinic_id!, profile.id, "doctor_called_patient", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function enterRoomAction(tokenId: string) {
  const profile = await requireAuth();
  const now = nowIso();

  const { error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    { entered_room_at: now },
    "entered_room"
  );

  if (error) return { error: error.message };
  await logQueueAction(profile.clinic_id!, profile.id, "patient_entered_room", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function startConsultationQueueAction(tokenId: string) {
  const profile = await requireAuth();
  const supabase = await createClient();
  const now = nowIso();

  const { data, error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    {
      status: "serving",
      serving_at: now,
      consultation_started_at: now,
      consultation_paused_at: null,
    },
    "consultation_started"
  );

  if (error) return { error: error.message };

  if (data?.doctor_id) {
    await supabase.from("doctors").update({ queue_status: "consulting" }).eq("id", data.doctor_id);
  }

  await logQueueAction(profile.clinic_id!, profile.id, "consultation_started", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function pauseConsultationAction(tokenId: string) {
  const profile = await requireAuth();
  const now = nowIso();

  const { error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    { consultation_paused_at: now },
    "consultation_paused"
  );

  if (error) return { error: error.message };
  await logQueueAction(profile.clinic_id!, profile.id, "consultation_paused", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function completeConsultationQueueAction(tokenId: string, sessionId?: string) {
  const profile = await requireAuth();
  const supabase = await createClient();
  const now = nowIso();

  const { data: token } = await supabase
    .from("queue_tokens")
    .select("consultation_started_at, serving_at, doctor_id, token_number, session_id")
    .eq("id", tokenId)
    .single();

  const startedAt = token?.consultation_started_at ?? token?.serving_at;
  const durationMins = startedAt
    ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
    : null;

  const { error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    {
      status: "completed",
      completed_at: now,
      consultation_completed_at: now,
      consultation_duration_mins: durationMins,
    },
    "consultation_completed"
  );

  if (error) return { error: error.message };

  if (token?.doctor_id) {
    await supabase.from("doctors").update({ queue_status: "available" }).eq("id", token.doctor_id);
  }

  if (token && sessionId) {
    await supabase
      .from("queue_sessions")
      .update({ current_token: token.token_number })
      .eq("id", sessionId);
  }

  await logQueueAction(profile.clinic_id!, profile.id, "consultation_completed", tokenId, { durationMins });
  revalidateQueue();
  return { success: true };
}

export async function sendToBillingAction(tokenId: string) {
  const profile = await requireAuth();
  const now = nowIso();

  const { error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    { billing_started_at: now },
    "billing"
  );

  if (error) return { error: error.message };
  await logQueueAction(profile.clinic_id!, profile.id, "sent_to_billing", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function completeBillingAction(tokenId: string) {
  const profile = await requireRole(["receptionist", "clinic_owner", "finance_manager"]);
  const now = nowIso();

  const { error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    { billing_completed_at: now },
    "billing_completed"
  );

  if (error) return { error: error.message };
  await logQueueAction(profile.clinic_id!, profile.id, "billing_completed", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function markLeftClinicAction(tokenId: string) {
  const profile = await requireRole(["receptionist", "clinic_owner", "nurse"]);
  const now = nowIso();

  const { error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    { left_clinic_at: now, status: "completed" },
    "exited"
  );

  if (error) return { error: error.message };
  await logQueueAction(profile.clinic_id!, profile.id, "patient_left_clinic", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function markFollowUpAction(tokenId: string) {
  const profile = await requireAuth();

  await logQueueAction(profile.clinic_id!, profile.id, "follow_up_marked", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function markTokenDispositionAction(
  tokenId: string,
  disposition: "no_show" | "late" | "rescheduled" | "cancelled" | "left_premises",
  status?: "no_show" | "cancelled" | "skipped"
) {
  const profile = await requireRole(["receptionist", "clinic_owner", "nurse"]);
  const supabase = await createClient();

  const finalStatus = status ?? (disposition === "no_show" ? "no_show" : "cancelled");
  const journeyStage = disposition === "no_show" ? "no_show" : "cancelled";

  const { error } = await patchToken(
    tokenId,
    profile.clinic_id!,
    {
      status: finalStatus,
      disposition,
      completed_at: nowIso(),
    },
    journeyStage as QueueJourneyStage
  );

  if (error) return { error: error.message };

  if (disposition === "no_show") {
    const { data: token } = await supabase
      .from("queue_tokens")
      .select("appointment_id")
      .eq("id", tokenId)
      .single();
    if (token?.appointment_id) {
      await supabase
        .from("appointments")
        .update({ status: "no_show" })
        .eq("id", token.appointment_id);
    }
  }

  await logQueueAction(profile.clinic_id!, profile.id, `disposition_${disposition}`, tokenId);
  revalidateQueue();
  return { success: true };
}

export async function completeTokenAndCallNextAction(tokenId: string, sessionId: string) {
  const completeResult = await completeConsultationQueueAction(tokenId, sessionId);
  if (completeResult.error) return completeResult;

  const profile = await requireAuth();
  const supabase = await createClient();

  const { data: waiting } = await supabase
    .from("queue_tokens")
    .select("*")
    .eq("session_id", sessionId)
    .eq("status", "waiting")
    .order("sort_order");

  const priorityOrder = { emergency: 0, vip: 1, normal: 2 };
  const sorted = [...(waiting ?? [])].sort((a, b) => {
    const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
    if (pa !== pb) return pa - pb;
    return (a.sort_order ?? a.token_number) - (b.sort_order ?? b.token_number);
  });

  if (sorted[0]) {
    await callPatientAction(sorted[0].id);
  }

  await logQueueAction(profile.clinic_id!, profile.id, "call_next_after_complete", tokenId);
  revalidateQueue();
  return { success: true };
}

export async function updateSessionAvgMinsAction(sessionId: string, avgMins: number) {
  const profile = await requireRole(["clinic_owner", "receptionist"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("queue_sessions")
    .update({ avg_consultation_mins: avgMins })
    .eq("id", sessionId)
    .eq("clinic_id", profile.clinic_id!);

  if (error) return { error: error.message };
  revalidateQueue();
  return { success: true };
}

export async function saveClinicQueueSettingsAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  const supabase = await createClient();

  const dailyCapacity = parseInt(String(formData.get("dailyPatientCapacity") ?? "50"), 10);
  const avgFee = parseFloat(String(formData.get("avgFeePerPatient") ?? "500"));

  const { data: clinic } = await supabase
    .from("clinics")
    .select("settings")
    .eq("id", profile.clinic_id!)
    .single();

  const settings = { ...((clinic?.settings ?? {}) as Record<string, unknown>) };
  settings.queue = {
    ...((settings.queue ?? {}) as Record<string, unknown>),
    dailyPatientCapacity: dailyCapacity,
    avgFeePerPatient: avgFee,
  };

  const { error } = await supabase
    .from("clinics")
    .update({
      settings,
      consultation_fee_default: avgFee,
      daily_patient_capacity: dailyCapacity,
    })
    .eq("id", profile.clinic_id!);

  if (error) return { error: error.message };
  return { success: true };
}
