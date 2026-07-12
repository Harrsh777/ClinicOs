"use client";

import { useState } from "react";
import { approveClinicApplicationAction, rejectClinicApplicationAction } from "@/lib/actions/platform-applications";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface ApplicationActionsProps {
  applicationId: string;
  planId?: string;
}

export function ApplicationActions({ applicationId, planId }: ApplicationActionsProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [manualCreds, setManualCreds] = useState<{ clinicCode?: string; tempPassword?: string } | null>(null);

  async function handleApprove() {
    setLoading("approve");
    setMessage(null);
    setManualCreds(null);
    const fd = new FormData();
    fd.set("applicationId", applicationId);
    if (planId) fd.set("planId", planId);
    const result = await approveClinicApplicationAction(fd);
    if (result?.error) setMessage({ type: "error", text: result.error });
    else {
      const parts = [`Clinic approved! Clinic ID: ${result.clinicCode}`];
      if (result.emailSent) parts.push("Credentials emailed to owner.");
      else if (result.tempPassword) {
        parts.push("Email not sent — share credentials manually:");
        setManualCreds({ clinicCode: result.clinicCode, tempPassword: result.tempPassword });
      }
      setMessage({ type: "success", text: parts.join(" ") });
    }
    setLoading(null);
  }

  async function handleReject() {
    const reason = window.prompt("Rejection reason (optional):") ?? "";
    setLoading("reject");
    setMessage(null);
    const fd = new FormData();
    fd.set("applicationId", applicationId);
    if (reason) fd.set("reason", reason);
    const result = await rejectClinicApplicationAction(fd);
    if (result?.error) setMessage({ type: "error", text: result.error });
    else setMessage({ type: "success", text: "Application rejected." });
    setLoading(null);
  }

  return (
    <div className="space-y-2">
      {message && (
        <Alert variant={message.type === "success" ? "success" : "error"} className="text-sm">
          {message.text}
        </Alert>
      )}
      {manualCreds && (
        <div className="rounded-lg bg-[var(--surface-2)] p-3 text-xs font-mono space-y-1">
          {manualCreds.clinicCode && <p>Clinic ID: {manualCreds.clinicCode}</p>}
          {manualCreds.tempPassword && <p>Password: {manualCreds.tempPassword}</p>}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" loading={loading === "approve"} onClick={handleApprove}>
          Approve
        </Button>
        <Button size="sm" variant="secondary" loading={loading === "reject"} onClick={handleReject}>
          Reject
        </Button>
      </div>
    </div>
  );
}
