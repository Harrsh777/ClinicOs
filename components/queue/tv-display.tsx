"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { QueueSession } from "@/lib/types/database";

interface TVDisplayProps {
  clinic: { id: string; name: string; slug: string };
  initialSession: QueueSession | null;
  initialTokens: { token_number: number; status: string }[];
}

export function TVDisplay({ clinic, initialSession, initialTokens }: TVDisplayProps) {
  const [session, setSession] = useState(initialSession);
  const [recentTokens, setRecentTokens] = useState(initialTokens);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tv-${clinic.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_sessions", filter: `clinic_id=eq.${clinic.id}` },
        async () => {
          const today = new Date().toISOString().split("T")[0];
          const { data } = await supabase
            .from("queue_sessions")
            .select("*")
            .eq("clinic_id", clinic.id)
            .eq("session_date", today)
            .maybeSingle();
          setSession(data as QueueSession | null);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens", filter: `clinic_id=eq.${clinic.id}` },
        async () => {
          if (!session) return;
          const { data } = await supabase
            .from("queue_tokens")
            .select("token_number, status")
            .eq("session_id", session.id)
            .in("status", ["called", "serving", "completed"])
            .order("token_number", { ascending: false })
            .limit(5);
          setRecentTokens(data ?? []);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinic.id, session]);

  return (
    <div className="tv-display">
      <p className="text-xl opacity-80 mb-2">{clinic.name}</p>
      <p className="text-sm opacity-60 mb-8 uppercase tracking-widest">Now Serving</p>
      <div className="tv-token-number">#{session?.current_token ?? 0}</div>
      <div className="mt-12 flex gap-8">
        {recentTokens.map((t) => (
          <div key={t.token_number} className="text-center opacity-70">
            <p className="text-3xl font-bold">#{t.token_number}</p>
            <p className="text-xs uppercase mt-1">{t.status}</p>
          </div>
        ))}
      </div>
      <p className="mt-auto text-sm opacity-50">Powered by ClinicOS</p>
    </div>
  );
}
