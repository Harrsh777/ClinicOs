"use client";

import { useState, useTransition } from "react";
import { updateAppointmentStatusAction } from "@/lib/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppointmentActions({ appointmentId, status }: { appointmentId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("Not available");

  if (status !== "pending") return null;

  function handleApprove() {
    startTransition(() => { void updateAppointmentStatusAction(appointmentId, "confirmed"); });
  }

  function handleReject() {
    startTransition(() => {
      void updateAppointmentStatusAction(appointmentId, "rejected", rejectReason.trim() || "Not available");
      setShowReject(false);
    });
  }

  return (
    <>
      <div className="flex gap-1">
        <Button size="sm" loading={pending && !showReject} onClick={handleApprove}>
          Approve
        </Button>
        <Button size="sm" variant="danger" loading={pending && !showReject} onClick={() => setShowReject(true)}>
          Reject
        </Button>
      </div>

      {showReject && (
        <dialog
          open
          className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-xl backdrop:bg-black/40"
        >
          <h3 className="font-semibold text-lg">Reject appointment?</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">The patient will be notified with your reason.</p>
          <div className="mt-4">
            <Input
              label="Reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Not available"
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowReject(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant="danger" loading={pending} onClick={handleReject}>
              Reject
            </Button>
          </div>
        </dialog>
      )}
    </>
  );
}
