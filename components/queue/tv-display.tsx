"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { QueueSession } from "@/lib/types/database";
import { formatTokenNumber } from "@/lib/queue/types";

interface TVToken {
  token_number: number;
  token_label?: string | null;
  status: string;
  priority?: string;
  journey_stage?: string | null;
  patient_type?: string | null;
  is_returning_patient?: boolean;
  doctors?: { room_number?: string | null; profiles?: { full_name?: string } } | null;
  patients?: { full_name?: string } | null;
}

interface TVDisplayProps {
  clinic: { id: string; name: string; slug: string };
  initialSession: QueueSession | null;
  initialTokens: TVToken[];
  initialServing: TVToken | null;
  initialNextTokens: TVToken[];
  initialEstimatedWait: number;
}

const PRIORITY_ORDER = { emergency: 0, vip: 1, normal: 2 };

export function TVDisplay({
  clinic,
  initialSession,
  initialServing,
  initialNextTokens,
  initialEstimatedWait,
}: TVDisplayProps) {
  const [session, setSession] = useState(initialSession);
  const [serving, setServing] = useState(initialServing);
  const [nextTokens, setNextTokens] = useState(initialNextTokens);
  const [estimatedWait, setEstimatedWait] = useState(initialEstimatedWait);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const today = new Date().toISOString().split("T")[0];
      const { data: sessionData } = await supabase
        .from("queue_sessions")
        .select("*")
        .eq("clinic_id", clinic.id)
        .eq("session_date", today)
        .maybeSingle();

      setSession(sessionData as QueueSession | null);
      if (!sessionData) return;

      const { data: tokens } = await supabase
        .from("queue_tokens")
        .select("token_number, token_label, status, priority, journey_stage, patient_type, is_returning_patient, doctor_id, patients(full_name), doctors(room_number, profiles(full_name))")
        .eq("session_id", sessionData.id)
        .order("sort_order");

      const list = tokens ?? [];
      const nowServing = list.find((t) => t.status === "serving" || t.status === "called") ?? null;
      const waiting = list.filter((t) => t.status === "waiting");
      const sorted = [...waiting].sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 2;
        const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 2;
        if (pa !== pb) return pa - pb;
        return a.token_number - b.token_number;
      });

      setServing(nowServing as TVToken | null);
      setNextTokens(sorted.slice(0, 8) as TVToken[]);
      setEstimatedWait(sorted.length * (sessionData.avg_consultation_mins ?? 15));
    }

    refresh();

    const channel = supabase
      .channel(`tv-${clinic.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_sessions", filter: `clinic_id=eq.${clinic.id}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens", filter: `clinic_id=eq.${clinic.id}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinic.id]);

  const nowLabel =
    serving?.token_label ??
    (serving ? formatTokenNumber(serving.token_number) : session?.current_token ? formatTokenNumber(session.current_token) : "—");

  const room = serving?.doctors?.room_number;
  const doctorName = serving?.doctors?.profiles?.full_name;
  const patientName = serving?.patients?.full_name;

  const finishTime = new Date(Date.now() + estimatedWait * 60000);

  return (
    <div className="tv-display min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white p-6 sm:p-10">
      <div className="absolute top-6 left-8 right-8 flex items-center justify-between text-sm opacity-70">
        <span className="font-medium">{clinic.name}</span>
        <time className="tabular-nums font-mono">
          {clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </time>
      </div>

      {/* Now serving */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-300/80 mb-3">
          Now Serving
        </p>
        <div className="tv-token-number text-[clamp(4rem,16vw,10rem)] font-black tracking-tighter text-white drop-shadow-[0_0_80px_rgba(20,184,166,0.35)] queue-pulse-border rounded-3xl px-8 py-4 border-2 border-teal-400/30">
          {nowLabel}
        </div>
        {patientName && (
          <p className="mt-4 text-xl font-medium text-slate-200">{patientName}</p>
        )}
        {doctorName && (
          <p className="mt-2 text-lg text-teal-200">{doctorName}{room ? ` · Room ${room}` : ""}</p>
        )}
      </div>

      {/* Timeline strip */}
      <div className="w-full max-w-5xl mx-auto mt-8">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-4">
          Queue Timeline
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          {nextTokens.length === 0 ? (
            <p className="text-slate-500 text-sm">No patients waiting</p>
          ) : (
            nextTokens.map((t, i) => {
              const isEmergency = t.priority === "emergency";
              const isReturning = t.is_returning_patient || t.patient_type === "returning";
              const isVip = t.priority === "vip" || t.patient_type === "vip";
              const label = t.token_label ?? formatTokenNumber(t.token_number);

              return (
                <div
                  key={t.token_number}
                  className={`
                    flex flex-col items-center justify-center rounded-2xl border-2 min-w-[72px] h-20 px-3
                    backdrop-blur-sm transition-transform
                    ${isEmergency ? "border-red-400/60 bg-red-500/15 text-red-100" :
                      isReturning ? "border-emerald-600/60 bg-emerald-800/40 text-white" :
                      isVip ? "border-amber-400/60 bg-amber-500/15 text-amber-100" :
                      "border-white/10 bg-white/5 text-white"}
                    ${i === 0 ? "scale-110 ring-2 ring-teal-400/40" : ""}
                  `}
                >
                  <span className="text-xl font-black tabular-nums">{label}</span>
                  <span className="text-[9px] uppercase tracking-wider opacity-60 mt-0.5">
                    {i === 0 ? "Next" : "Waiting"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ETA footer */}
      <div className="mt-10 grid grid-cols-2 gap-4 max-w-lg mx-auto w-full">
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 px-6 py-4 text-center backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-widest text-teal-300/70">Est. wait</p>
          <p className="text-3xl font-bold text-teal-200 mt-1 tabular-nums">~{estimatedWait}m</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">Queue done by</p>
          <p className="text-3xl font-bold text-white mt-1 tabular-nums">
            {finishTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
          </p>
        </div>
      </div>

      <p className="mt-8 text-center text-[10px] opacity-30 tracking-wider">ClinicOS Live Queue</p>
    </div>
  );
}
