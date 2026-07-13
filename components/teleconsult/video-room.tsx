"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Video } from "lucide-react";

interface VideoRoomProps {
  sessionId: string;
  roomId: string;
  meetingUrl?: string | null;
  dailyRoomUrl?: string | null;
  role: "doctor" | "patient";
  status: string;
  onJoin: () => Promise<void>;
  onEnd?: () => Promise<void>;
  patientName?: string;
  doctorName?: string;
}

export function VideoRoom({
  meetingUrl,
  dailyRoomUrl,
  role,
  status,
  patientName,
  doctorName,
}: VideoRoomProps) {
  const joinUrl = meetingUrl ?? dailyRoomUrl ?? null;
  const isGoogleMeet = joinUrl?.includes("meet.google.com");

  if (joinUrl && isGoogleMeet) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden bg-[var(--surface-1)]">
        <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-8 text-center text-white">
          <Video className="h-12 w-12 mb-4 opacity-80" />
          <h3 className="text-lg font-semibold mb-2">Google Meet consultation</h3>
          <p className="text-sm opacity-80 mb-6 max-w-md">
            {role === "doctor"
              ? `Open Google Meet to start the video call with ${patientName}.`
              : `Join the video call with Dr. ${doctorName} using the Google Meet link.`}
          </p>
          <a href={joinUrl} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="gap-2">
              <ExternalLink className="h-5 w-5" />
              Open Google Meet
            </Button>
          </a>
          {role === "patient" && status === "scheduled" && (
            <p className="text-xs opacity-70 mt-4">The link was also sent to your WhatsApp.</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 p-4 border-t border-[var(--border)]">
          <Badge variant="neutral">Google Meet</Badge>
          <span className="text-xs text-[var(--text-muted)] truncate">{joinUrl}</span>
        </div>
      </div>
    );
  }

  if (dailyRoomUrl) {
    return (
      <div className="rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border)] bg-black aspect-video">
        <iframe
          src={dailyRoomUrl}
          allow="camera; microphone; fullscreen; display-capture"
          className="w-full h-full min-h-[400px]"
          title="Video consultation"
        />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden bg-[var(--surface-2)]">
      <div className="aspect-video bg-slate-900 flex items-center justify-center p-8 text-center text-white">
        <div>
          <Video className="h-12 w-12 mx-auto mb-4 opacity-60" />
          <h3 className="text-lg font-semibold mb-2">
            {role === "doctor" ? "Waiting for Google Meet link" : "Meeting link coming soon"}
          </h3>
          <p className="text-sm opacity-70 max-w-sm">
            {role === "doctor"
              ? "Paste your Google Meet link above and send it to the patient on WhatsApp."
              : "Your doctor will send a Google Meet link on WhatsApp before the consultation."}
          </p>
        </div>
      </div>
    </div>
  );
}
