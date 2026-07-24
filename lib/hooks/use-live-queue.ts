"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  DoctorQueueInfo,
  EnrichedQueueToken,
  QueueClinicSettings,
} from "@/lib/queue/types";

export interface LiveQueueAuditLog {
  id: string;
  action: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  profiles?: { full_name: string } | null;
}

export function useLiveQueue(clinicId: string | null) {
  const [session, setSession] = useState<{
    id: string;
    current_token: number;
    avg_consultation_mins: number;
    session_date: string;
  } | null>(null);
  const [tokens, setTokens] = useState<EnrichedQueueToken[]>([]);
  const [doctors, setDoctors] = useState<DoctorQueueInfo[]>([]);
  const [clinicSettings, setClinicSettings] = useState<QueueClinicSettings>({
    dailyPatientCapacity: 50,
    avgFeePerPatient: 500,
  });
  const [durationsByDoctor, setDurationsByDoctor] = useState<Record<string, number[]>>({});
  const [auditLogs, setAuditLogs] = useState<LiveQueueAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    if (!clinicId) return;
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const [{ data: clinic }, { data: sessionData }, { data: doctorData }] = await Promise.all([
      supabase
        .from("clinics")
        .select("settings, consultation_fee_default, daily_patient_capacity")
        .eq("id", clinicId)
        .single(),
      supabase
        .from("queue_sessions")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("session_date", today)
        .maybeSingle(),
      supabase
        .from("doctors")
        .select(
          "id, profile_id, specialization, department, room_number, queue_status, queue_paused, avg_consultation_mins, slot_duration_mins, profiles(full_name)"
        )
        .eq("clinic_id", clinicId),
    ]);

    const settings = (clinic?.settings ?? {}) as Record<string, unknown>;
    const queueSettings = (settings.queue ?? {}) as Record<string, unknown>;
    setClinicSettings({
      dailyPatientCapacity:
        Number(clinic?.daily_patient_capacity) ||
        Number(queueSettings.dailyPatientCapacity) ||
        50,
      avgFeePerPatient:
        Number(queueSettings.avgFeePerPatient) ||
        Number(clinic?.consultation_fee_default) ||
        500,
    });

    setDoctors((doctorData ?? []) as unknown as DoctorQueueInfo[]);
    setSession(sessionData as typeof session);

    if (sessionData) {
      const { data: tokenData } = await supabase
        .from("queue_tokens")
        .select(
          "*, patients(full_name, phone, date_of_birth, gender), appointments(appointment_time, notes), doctors(specialization, department, room_number, profiles(full_name))"
        )
        .eq("session_id", sessionData.id)
        .order("sort_order", { ascending: true });
      setTokens((tokenData ?? []) as EnrichedQueueToken[]);
    } else {
      setTokens([]);
    }

    const { data: todayConsults } = await supabase
      .from("consultations")
      .select("doctor_id, started_at, ended_at")
      .eq("clinic_id", clinicId)
      .gte("started_at", `${today}T00:00:00`)
      .not("ended_at", "is", null);

    const map: Record<string, number[]> = {};
    for (const c of todayConsults ?? []) {
      if (!c.started_at || !c.ended_at || !c.doctor_id) continue;
      const mins = Math.round(
        (new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()) / 60000
      );
      map[c.doctor_id] = [...(map[c.doctor_id] ?? []), mins];
    }
    setDurationsByDoctor(map);

    const { data: logs } = await supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata, profiles:actor_id(full_name)")
      .eq("clinic_id", clinicId)
      .eq("entity_type", "queue")
    .order("created_at", { ascending: false })
    .limit(30);

    setAuditLogs((logs ?? []) as unknown as LiveQueueAuditLog[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) void fetchData();
    });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  useEffect(() => {
    if (!clinicId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`live-queue-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_sessions", filter: `clinic_id=eq.${clinicId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens", filter: `clinic_id=eq.${clinicId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "doctors", filter: `clinic_id=eq.${clinicId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId, fetchData]);

  // Re-render timers every 1s for live consultation clocks
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    session,
    tokens,
    doctors,
    clinicSettings,
    durationsByDoctor,
    auditLogs,
    loading,
    tick,
    refetch: fetchData,
  };
}
