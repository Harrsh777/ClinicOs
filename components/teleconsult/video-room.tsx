"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor } from "lucide-react";

interface VideoRoomProps {
  sessionId: string;
  roomId: string;
  dailyRoomUrl?: string | null;
  role: "doctor" | "patient";
  status: string;
  onJoin: () => Promise<void>;
  onEnd?: () => Promise<void>;
  patientName?: string;
  doctorName?: string;
}

export function VideoRoom({
  sessionId,
  roomId,
  dailyRoomUrl,
  role,
  status,
  onJoin,
  onEnd,
  patientName,
  doctorName,
}: VideoRoomProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [joined, setJoined] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  async function handleJoin() {
    setJoining(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(media);
      if (videoRef.current) videoRef.current.srcObject = media;
      await onJoin();
      setJoined(true);
    } catch {
      await onJoin();
      setJoined(true);
    } finally {
      setJoining(false);
    }
  }

  function toggleVideo() {
    if (stream) {
      stream.getVideoTracks().forEach((t) => { t.enabled = !videoOn; });
      setVideoOn(!videoOn);
    }
  }

  function toggleAudio() {
    if (stream) {
      stream.getAudioTracks().forEach((t) => { t.enabled = !audioOn; });
      setAudioOn(!audioOn);
    }
  }

  function handleEnd() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    void onEnd?.();
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
        {role === "doctor" && onEnd && (
          <div className="p-3 bg-[var(--surface-0)] border-t border-[var(--border)]">
            <Button variant="danger" onClick={() => void handleEnd()} className="gap-2">
              <PhoneOff className="h-4 w-4" /> End Call
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden bg-[var(--surface-2)]">
      <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
        {!joined ? (
          <div className="text-center text-white p-8">
            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-60" />
            <h3 className="text-lg font-semibold mb-2">
              {status === "waiting" && role === "patient"
                ? "Waiting for doctor to join..."
                : "Ready to join video consultation"}
            </h3>
            <p className="text-sm opacity-70 mb-6">
              {role === "doctor" ? `Patient: ${patientName}` : `Doctor: ${doctorName}`}
            </p>
            <Button onClick={() => void handleJoin()} loading={joining} size="lg" className="gap-2">
              <Video className="h-5 w-5" />
              {role === "doctor" ? "Start Video Call" : "Join Call"}
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={role === "doctor"}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge variant="success">Live</Badge>
              <Badge variant="neutral">Room: {roomId.slice(0, 12)}...</Badge>
            </div>
            {status === "waiting" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white text-lg">
                  {role === "patient" ? "Waiting for doctor..." : "Waiting for patient..."}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {joined && (
        <div className="flex items-center justify-center gap-3 p-4 bg-[var(--surface-0)] border-t border-[var(--border)]">
          <Button variant={videoOn ? "secondary" : "danger"} size="sm" onClick={toggleVideo}>
            {videoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button variant={audioOn ? "secondary" : "danger"} size="sm" onClick={toggleAudio}>
            {audioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          {role === "doctor" && onEnd && (
            <Button variant="danger" size="sm" onClick={() => void handleEnd()} className="gap-2">
              <PhoneOff className="h-4 w-4" /> End
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
