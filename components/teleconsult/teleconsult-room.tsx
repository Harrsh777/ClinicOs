"use client";

import { VideoRoom } from "@/components/teleconsult/video-room";
import { SendMeetLinkPanel } from "@/components/teleconsult/send-meet-link-panel";
import { joinTeleconsultAction, endTeleconsultAction } from "@/lib/actions/teleconsult";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Stethoscope } from "lucide-react";

interface TeleconsultRoomProps {
  session: {
    id: string;
    room_id: string;
    daily_room_url?: string | null;
    meeting_url?: string | null;
    meet_link_sent_at?: string | null;
    status: string;
    patients: { full_name: string; phone: string };
    doctors: { profiles: { full_name: string } | null };
    appointments?: { appointment_date: string; appointment_time: string } | null;
  };
  role: "doctor" | "patient";
}

export function TeleconsultRoom({ session, role }: TeleconsultRoomProps) {
  const apt = session.appointments;
  const meetingUrl = session.meeting_url ?? session.daily_room_url ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        {role === "doctor" ? (
          <SendMeetLinkPanel
            sessionId={session.id}
            meetingUrl={meetingUrl}
            meetLinkSentAt={session.meet_link_sent_at}
            patientName={session.patients.full_name}
          />
        ) : (
          <SendMeetLinkPanel
            sessionId={session.id}
            meetingUrl={meetingUrl}
            meetLinkSentAt={session.meet_link_sent_at}
            patientName={session.patients.full_name}
            readOnly
          />
        )}

        <VideoRoom
          sessionId={session.id}
          roomId={session.room_id}
          meetingUrl={meetingUrl}
          dailyRoomUrl={session.daily_room_url}
          role={role}
          status={session.status}
          onJoin={async () => { await joinTeleconsultAction(session.id, role); }}
          onEnd={role === "doctor" ? async () => { await endTeleconsultAction(session.id); } : undefined}
          patientName={session.patients.full_name}
          doctorName={session.doctors?.profiles?.full_name ?? "Doctor"}
        />
      </div>

      <div className="space-y-4">
        <Card>
          <h4 className="font-medium mb-3">Session Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Status</span>
              <StatusBadge status={session.status} />
            </div>
            {apt && (
              <>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Date</span>
                  <span>{apt.appointment_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Time</span>
                  <span>{apt.appointment_time}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Patient</span>
              <span>{session.patients.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Phone</span>
              <span>{session.patients.phone}</span>
            </div>
          </div>
        </Card>

        {role === "doctor" && session.status === "in_progress" && (
          <Link href={`/doctor/consultations`}>
            <Button variant="secondary" className="w-full gap-2">
              <Stethoscope className="h-4 w-4" />
              Open Consultation Notes
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
