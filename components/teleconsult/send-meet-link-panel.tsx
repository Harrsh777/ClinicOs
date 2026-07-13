"use client";

import { useState } from "react";
import { sendMeetLinkAction } from "@/lib/actions/teleconsult";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MessageCircle, Send } from "lucide-react";

interface SendMeetLinkPanelProps {
  sessionId: string;
  meetingUrl?: string | null;
  meetLinkSentAt?: string | null;
  patientName: string;
  readOnly?: boolean;
}

export function SendMeetLinkPanel({
  sessionId,
  meetingUrl,
  meetLinkSentAt,
  patientName,
  readOnly = false,
}: SendMeetLinkPanelProps) {
  const [meetUrl, setMeetUrl] = useState(meetingUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sentUrl, setSentUrl] = useState(meetingUrl ?? null);
  const [sentAt, setSentAt] = useState(meetLinkSentAt ?? null);

  async function handleSend() {
    setLoading(true);
    setMessage(null);
    const result = await sendMeetLinkAction(sessionId, meetUrl);
    setLoading(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    setSentUrl(result.meetUrl ?? meetUrl);
    setSentAt(new Date().toISOString());
    setMessage({
      type: "success",
      text: result.simulated
        ? `Link saved. WhatsApp simulated in dev — ${patientName} would receive the link on their phone.`
        : `Google Meet link sent to ${patientName} on WhatsApp.`,
    });
  }

  if (readOnly) {
    if (!sentUrl) {
      return (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            Your doctor will send a Google Meet link on WhatsApp before the consultation.
          </p>
        </Card>
      );
    }

    return (
      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h4 className="font-medium">Video meeting link</h4>
          {sentAt && <Badge variant="success">Sent on WhatsApp</Badge>}
        </div>
        <a
          href={sentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-600)] hover:underline break-all"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          Join Google Meet
        </a>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h4 className="font-medium">Send Google Meet link</h4>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Paste your Google Meet URL. {patientName} will receive it on WhatsApp.
          </p>
        </div>
        {sentAt && (
          <Badge variant="success" className="shrink-0 gap-1">
            <MessageCircle className="h-3 w-3" />
            Sent
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        <Input
          label="Google Meet link"
          placeholder="https://meet.google.com/abc-defg-hij"
          value={meetUrl}
          onChange={(e) => setMeetUrl(e.target.value)}
        />

        {message && <Alert variant={message.type === "error" ? "error" : "success"}>{message.text}</Alert>}

        {sentUrl && (
          <a
            href={sentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ExternalLink className="h-4 w-4" />
            Preview link
          </a>
        )}

        <Button
          className="w-full gap-2"
          onClick={() => void handleSend()}
          loading={loading}
          disabled={!meetUrl.trim()}
        >
          <Send className="h-4 w-4" />
          {sentAt ? "Resend on WhatsApp" : "Send link on WhatsApp"}
        </Button>
      </div>
    </Card>
  );
}
