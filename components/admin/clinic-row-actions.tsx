"use client";

import { useState } from "react";
import {
  approveClinicApplicationAction,
  rejectClinicApplicationAction,
  resendApprovalEmailAction,
} from "@/lib/actions/platform-applications";
import { suspendClinicAction } from "@/lib/actions/admin";
import { reactivateClinicAction } from "@/lib/actions/clinic-management";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

interface ClinicRowActionsProps {
  applicationId: string | null;
  clinicId: string | null;
  status: string;
  planId?: string;
}

export function ClinicRowActions({ applicationId, clinicId, status, planId }: ClinicRowActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [manualCreds, setManualCreds] = useState<{ clinicCode?: string; tempPassword?: string } | null>(null);

  async function handleApprove() {
    if (!applicationId) return;
    setLoading("approve");
    setMessage(null);
    setManualCreds(null);
    const fd = new FormData();
    fd.set("applicationId", applicationId);
    if (planId) fd.set("planId", planId);
    const result = await approveClinicApplicationAction(fd);
    if (result?.error) setMessage({ type: "error", text: result.error });
    else {
      const parts = [`Approved! Clinic ID: ${result.clinicCode}`];
      if (result.emailSent) parts.push("Credentials emailed to owner.");
      else if (result.tempPassword) {
        parts.push("Email not sent — share credentials manually.");
        setManualCreds({ clinicCode: result.clinicCode, tempPassword: result.tempPassword });
      }
      setMessage({ type: "success", text: parts.join(" ") });
    }
    setLoading(null);
  }

  async function handleReject() {
    if (!applicationId) return;
    setLoading("reject");
    setMessage(null);
    const fd = new FormData();
    fd.set("applicationId", applicationId);
    if (rejectReason) fd.set("reason", rejectReason);
    const result = await rejectClinicApplicationAction(fd);
    if (result?.error) setMessage({ type: "error", text: result.error });
    else {
      setMessage({ type: "success", text: "Application rejected. Owner notified by email." });
      setShowReject(false);
    }
    setLoading(null);
  }

  async function handleSuspend() {
    if (!clinicId) return;
    setLoading("suspend");
    const result = await suspendClinicAction(clinicId, true);
    if (result?.error) setMessage({ type: "error", text: result.error });
    else setMessage({ type: "success", text: "Clinic suspended. Login and public booking disabled." });
    setLoading(null);
  }

  async function handleReactivate() {
    if (!clinicId) return;
    setLoading("reactivate");
    const result = await reactivateClinicAction(clinicId);
    if (result?.error) setMessage({ type: "error", text: result.error });
    else setMessage({ type: "success", text: "Clinic reactivated." });
    setLoading(null);
  }

  async function handleResend() {
    if (!applicationId) return;
    setLoading("resend");
    const fd = new FormData();
    fd.set("applicationId", applicationId);
    const result = await resendApprovalEmailAction(fd);
    if (result?.error) setMessage({ type: "error", text: result.error });
    else {
      if (result.tempPassword) setManualCreds({ tempPassword: result.tempPassword });
      setMessage({ type: "success", text: result.emailSent ? "Credentials resent." : "New password generated — share manually." });
    }
    setLoading(null);
  }

  return (
    <div className="space-y-2 min-w-[200px]">
      {message && (
        <Alert variant={message.type === "success" ? "success" : "error"} className="text-xs">
          {message.text}
        </Alert>
      )}
      {manualCreds && (
        <div className="rounded-lg bg-[var(--surface-2)] p-2 text-xs font-mono">
          {manualCreds.clinicCode && <p>Clinic ID: {manualCreds.clinicCode}</p>}
          {manualCreds.tempPassword && <p>Password: {manualCreds.tempPassword}</p>}
        </div>
      )}

      {status === "pending" && applicationId && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" loading={loading === "approve"} onClick={handleApprove}>Approve</Button>
          <Button size="sm" variant="secondary" onClick={() => setShowReject(!showReject)}>Reject</Button>
        </div>
      )}

      {showReject && (
        <div className="space-y-2 rounded-lg border border-[var(--border)] p-3">
          <Input
            label="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Optional reason for the applicant"
          />
          <Button size="sm" variant="danger" loading={loading === "reject"} onClick={handleReject}>
            Confirm reject
          </Button>
        </div>
      )}

      {(status === "approved" || status === "active" || status === "trial") && clinicId && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" loading={loading === "suspend"} onClick={handleSuspend}>
            Suspend
          </Button>
          {applicationId && (
            <Button size="sm" variant="ghost" loading={loading === "resend"} onClick={handleResend}>
              Resend credentials
            </Button>
          )}
        </div>
      )}

      {status === "suspended" && clinicId && (
        <Button size="sm" loading={loading === "reactivate"} onClick={handleReactivate}>
          Reactivate
        </Button>
      )}
    </div>
  );
}
