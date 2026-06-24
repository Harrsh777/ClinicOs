"use client";

import { useState, useTransition } from "react";
import { revokeStaffInviteAction, resendStaffInviteAction } from "@/lib/actions/owner";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";

export function PendingInviteActions({
  inviteId,
  token,
}: {
  inviteId: string;
  token: string;
}) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = inviteUrl ?? `${baseUrl}/invite/${token}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CopyButton text={url} label="Copy link" />
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await resendStaffInviteAction(inviteId);
            if (result?.error) setMessage(result.error);
            else if (result?.inviteUrl) {
              setInviteUrl(result.inviteUrl);
              setMessage(result.emailSent ? "Invite email resent" : "Invite extended. Copy link to share.");
            }
          })
        }
      >
        Resend
      </Button>
      <Button
        size="sm"
        variant="ghost"
        loading={pending}
        onClick={() => {
          if (!confirm("Revoke this invite? The link will stop working.")) return;
          startTransition(async () => {
            const result = await revokeStaffInviteAction(inviteId);
            setMessage(result?.error ?? "Invite revoked");
          });
        }}
      >
        Revoke
      </Button>
      {message && <span className="text-xs text-[var(--text-muted)]">{message}</span>}
    </div>
  );
}
