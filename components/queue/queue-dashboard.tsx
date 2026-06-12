"use client";

import { useTransition } from "react";
import { useQueueRealtime } from "@/lib/hooks/use-queue-realtime";
import {
  updateCurrentTokenAction,
  updateTokenStatusAction,
  callNextTokenAction,
} from "@/lib/actions/queue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ListOrdered } from "lucide-react";
import type { QueueToken } from "@/lib/types/database";

const PRIORITY_ORDER = { emergency: 0, vip: 1, normal: 2 };

function sortTokens(tokens: QueueToken[]) {
  return [...tokens].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 2;
    const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 2;
    if (pa !== pb) return pa - pb;
    return a.token_number - b.token_number;
  });
}

export function QueueDashboard({ clinicId }: { clinicId: string }) {
  const { session, tokens, loading } = useQueueRealtime(clinicId, null);
  const [pending, startTransition] = useTransition();

  const waiting = sortTokens(tokens.filter((t) => t.status === "waiting"));
  const active = tokens.filter((t) => ["called", "serving"].includes(t.status));

  if (loading) {
    return <div className="clinic-skeleton h-64" />;
  }

  if (!session) {
    return (
      <EmptyState
        icon={<ListOrdered />}
        title="No queue session today"
        description="Tokens will appear when patients check in or walk-ins are registered"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-sm text-[var(--text-muted)]">Current Token</p>
          <p className="clinic-token-display mt-2">#{session.current_token}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-[var(--text-muted)]">Waiting</p>
          <p className="text-3xl font-bold mt-2">{waiting.length}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-[var(--text-muted)]">Avg Consultation</p>
          <p className="text-3xl font-bold mt-2">{session.avg_consultation_mins}m</p>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold mb-4">Queue Controls</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const num = parseInt(new FormData(e.currentTarget).get("token") as string, 10);
              startTransition(() => { void updateCurrentTokenAction(session.id, num); });
            }}
            className="flex gap-2 items-end"
          >
            <Input label="Set Current Token" name="token" type="number" defaultValue={session.current_token} className="w-32" />
            <Button type="submit" loading={pending}>Update</Button>
          </form>
          <Button
            onClick={() => startTransition(() => { void callNextTokenAction(session.id); })}
            loading={pending}
          >
            Call Next
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const next = session.current_token + 1;
              startTransition(() => { void updateCurrentTokenAction(session.id, next); });
            }}
          >
            Advance Token (+1)
          </Button>
        </div>
      </Card>

      {active.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Active</h3>
          <div className="space-y-2">
            {active.map((t) => (
              <TokenRow key={t.id} token={t} onAction={(status) => startTransition(() => { void updateTokenStatusAction(t.id, status); })} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-3">Waiting Queue</h3>
        {waiting.length === 0 ? (
          <EmptyState title="No patients waiting" />
        ) : (
          <div className="space-y-2">
            {waiting.map((t) => (
              <TokenRow key={t.id} token={t} onAction={(status) => startTransition(() => { void updateTokenStatusAction(t.id, status); })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TokenRow({
  token,
  onAction,
}: {
  token: QueueToken;
  onAction: (status: "called" | "serving" | "completed" | "skipped") => void;
}) {
  const patient = token.patients as { full_name: string; phone: string } | undefined;

  return (
    <Card padding className="!p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-[var(--brand-600)]">
          {(token as { token_label?: string }).token_label ?? `#${token.token_number}`}
        </span>
        <div>
          <p className="font-medium">{patient?.full_name ?? "Patient"}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            <StatusBadge status={token.status} />
            {token.priority !== "normal" && <StatusBadge status={token.priority} />}
            {(token as { payment_status?: string }).payment_status === "pending" && (
              <StatusBadge status="pending" />
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {token.status === "waiting" && (
          <Button size="sm" onClick={() => onAction("called")}>Call</Button>
        )}
        {token.status === "called" && (
          <Button size="sm" onClick={() => onAction("serving")}>Start</Button>
        )}
        {token.status === "serving" && (
          <Button size="sm" onClick={() => onAction("completed")}>Complete</Button>
        )}
        {["waiting", "called"].includes(token.status) && (
          <Button size="sm" variant="ghost" onClick={() => onAction("skipped")}>Skip</Button>
        )}
      </div>
    </Card>
  );
}
