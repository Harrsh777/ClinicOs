"use client";

import { useState } from "react";
import { usePatientQueueToken } from "@/lib/hooks/use-queue-realtime";
import { calculateETA } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

export function PatientQueueView({
  patientId,
  clinicId,
}: {
  patientId: string;
  clinicId: string;
}) {
  const [now] = useState(() => Date.now());
  const { myToken, session, loading } = usePatientQueueToken(patientId, clinicId);

  if (loading) return <div className="clinic-skeleton h-48" />;

  if (!myToken || !session) {
    return (
      <Card className="text-center py-8">
        <p className="text-[var(--text-muted)]">You don&apos;t have an active token today.</p>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          Scan the clinic QR code to check in when you arrive.
        </p>
      </Card>
    );
  }

  const eta = calculateETA(myToken.token_number, session.current_token, session.avg_consultation_mins);
  const etaTime = new Date(now + eta.minutes * 60000).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="text-center">
        <p className="text-sm text-[var(--text-muted)]">Your Token</p>
        <p className="clinic-token-display text-5xl mt-2">
          {(myToken as { token_label?: string }).token_label ?? `#${myToken.token_number}`}
        </p>
        <div className="mt-2"><StatusBadge status={myToken.status} /></div>
      </Card>
      <Card className="text-center">
        <p className="text-sm text-[var(--text-muted)]">Current Token</p>
        <p className="text-4xl font-bold mt-2 text-[var(--text-primary)]">#{session.current_token}</p>
      </Card>
      <Card className="text-center">
        <p className="text-sm text-[var(--text-muted)]">Position</p>
        <p className="text-4xl font-bold mt-2">{eta.position}</p>
        <p className="text-xs text-[var(--text-muted)]">ahead of you</p>
      </Card>
      <Card className="text-center">
        <p className="text-sm text-[var(--text-muted)]">Expected Time</p>
        <p className="text-3xl font-bold mt-2 text-[var(--brand-600)]">{etaTime}</p>
        <p className="text-xs text-[var(--text-muted)]">~{eta.minutes} min wait</p>
      </Card>
    </div>
  );
}
