"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { QueueSession, QueueToken } from "@/lib/types/database";

export function useQueueRealtime(clinicId: string | null, sessionId: string | null) {
  const [session, setSession] = useState<QueueSession | null>(null);
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!clinicId) return;
    const supabase = createClient();

    const today = new Date().toISOString().split("T")[0];
    const { data: sessionData } = await supabase
      .from("queue_sessions")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("session_date", today)
      .maybeSingle();

    if (sessionData) {
      setSession(sessionData as QueueSession);
      const { data: tokenData } = await supabase
        .from("queue_tokens")
        .select("*, patients(full_name, phone)")
        .eq("session_id", sessionData.id)
        .order("token_number");
      setTokens((tokenData ?? []) as QueueToken[]);
    } else {
      setSession(null);
      setTokens([]);
    }
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, sessionId]);

  useEffect(() => {
    if (!clinicId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`queue-${clinicId}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId, fetchData]);

  return { session, tokens, loading, refetch: fetchData };
}

export function usePatientQueueToken(patientId: string | null, clinicId: string | null) {
  const [myToken, setMyToken] = useState<QueueToken | null>(null);
  const { session, loading, refetch } = useQueueRealtime(clinicId, null);

  useEffect(() => {
    if (!patientId || !session) {
      setMyToken(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("queue_tokens")
      .select("*")
      .eq("session_id", session.id)
      .eq("patient_id", patientId)
      .in("status", ["waiting", "called", "serving"])
      .maybeSingle()
      .then(({ data }) => setMyToken(data as QueueToken | null));
  }, [patientId, session]);

  return { myToken, session, loading, refetch };
}
