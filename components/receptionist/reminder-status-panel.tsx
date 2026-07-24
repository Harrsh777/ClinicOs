"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markFollowUpCompletedAction } from "@/lib/actions/follow-up-reminders";
import type { FollowUpReminderRow } from "@/lib/actions/follow-up-reminders";
import { MessageCircle } from "lucide-react";
import { formatPhone } from "@/lib/utils";
import { REMINDER_TYPE_LABELS } from "@/lib/engagement/types";

function displayStatus(reminder: FollowUpReminderRow): string {
  if (reminder.status === "completed" || reminder.status === "cancelled") {
    return reminder.status;
  }
  const wa = reminder.whatsapp_messages;
  if (wa?.delivery_status) return wa.delivery_status;
  return reminder.status;
}

export function ReminderStatusPanel({ reminders }: { reminders: FollowUpReminderRow[] }) {
  const [tomorrowStr] = useState(() => new Date(Date.now() + 86400000).toISOString().split("T")[0]);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const active = reminders.filter((r) => !["completed", "cancelled"].includes(r.status));

  if (!active.length) {
    return (
      <Card className="!p-4">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <MessageCircle className="h-4 w-4" />
          No follow-up reminders due in the next 7 days
        </div>
      </Card>
    );
  }

  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[var(--brand-500)]" />
          Follow-up WhatsApp reminders
        </h3>
        <Badge variant="info">{active.length} active</Badge>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {active.map((reminder) => {
          const status = displayStatus(reminder);
          const isTomorrow = reminder.follow_up_date === tomorrowStr;

          return (
            <div
              key={reminder.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {reminder.patient_name}
                  {isTomorrow && (
                    <Badge variant="brand" className="ml-2 text-[10px]">
                      Tomorrow
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatPhone(reminder.patient_phone)} ·{" "}
                  {REMINDER_TYPE_LABELS[reminder.reminder_type as keyof typeof REMINDER_TYPE_LABELS] ?? reminder.reminder_type} ·{" "}
                  {new Date(reminder.follow_up_date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                  {reminder.diagnosis ? ` · ${reminder.diagnosis}` : ""}
                </p>
                {reminder.patient_response && (
                  <p className="text-xs mt-1 text-[var(--brand-700)]">
                    Reply: {reminder.patient_response}
                    {reminder.recovery_analysis?.doctor_attention_required && (
                      <Badge variant="warning" className="ml-2 text-[10px]">
                        Doctor attention
                      </Badge>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                {status === "scheduled" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await markFollowUpCompletedAction(reminder.id);
                        router.refresh();
                      })
                    }
                  >
                    Mark done
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
