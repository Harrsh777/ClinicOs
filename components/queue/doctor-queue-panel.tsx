"use client";

import { useTransition } from "react";
import { useQueueRealtime } from "@/lib/hooks/use-queue-realtime";
import { startConsultationAction } from "@/lib/actions/consultations";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import type { QueueToken } from "@/lib/types/database";
import { ListOrdered } from "lucide-react";

export function DoctorQueuePanel({ clinicId, doctorId }: { clinicId: string; doctorId: string }) {
  const { tokens, loading } = useQueueRealtime(clinicId, null);
  const [pending, startTransition] = useTransition();

  const myTokens = tokens.filter(
    (t) => t.doctor_id === doctorId && ["called", "serving", "waiting"].includes(t.status)
  );

  if (loading) return <div className="clinic-skeleton h-48" />;

  if (!myTokens.length) {
    return <EmptyState icon={<ListOrdered />} title="No patients in your queue" />;
  }

  function handleStart(token: QueueToken) {
    startTransition(() => {
      void startConsultationAction({
        patientId: token.patient_id,
        doctorId: token.doctor_id!,
        appointmentId: token.appointment_id ?? undefined,
        queueTokenId: token.id,
      });
    });
  }

  return (
    <div className="space-y-3">
      {myTokens.map((token) => {
        const patient = token.patients as { full_name: string } | undefined;
        return (
          <Card key={token.id} padding className="!p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-[var(--brand-600)]">#{token.token_number}</span>
              <div>
                <p className="font-medium">{patient?.full_name}</p>
                <StatusBadge status={token.status} />
              </div>
            </div>
            <Button loading={pending} onClick={() => handleStart(token)}>
              {token.status === "serving" ? "Continue Consultation" : "Start Consultation"}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
