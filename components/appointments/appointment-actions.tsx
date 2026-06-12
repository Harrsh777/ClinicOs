"use client";

import { useTransition } from "react";
import { updateAppointmentStatusAction } from "@/lib/actions/appointments";
import { Button } from "@/components/ui/button";

export function AppointmentActions({ appointmentId, status }: { appointmentId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  if (status !== "pending") return null;

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        loading={pending}
        onClick={() => startTransition(() => { void updateAppointmentStatusAction(appointmentId, "confirmed"); })}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="danger"
        loading={pending}
        onClick={() => startTransition(() => { void updateAppointmentStatusAction(appointmentId, "rejected", "Not available"); })}
      >
        Reject
      </Button>
    </div>
  );
}
