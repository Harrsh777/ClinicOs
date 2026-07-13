"use client";

import { useState, useTransition } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateRetentionMessageAction,
  sendRetentionMessageAction,
} from "@/lib/actions/patient-retention";
import type { RetentionPatientRow } from "@/lib/retention/types";
import { formatPhone } from "@/lib/utils";

interface RetentionWhatsAppModalProps {
  patient: RetentionPatientRow;
  clinicName: string;
  onClose: () => void;
  onSent: (message: string) => void;
}

function formatLastVisit(date: string | null, days: number | null) {
  if (!date) return "Never";
  const formatted = new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (days === null) return formatted;
  return `${formatted} (${days}d ago)`;
}

export function RetentionWhatsAppModal({
  patient,
  clinicName,
  onClose,
  onSent,
}: RetentionWhatsAppModalProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewSent, setPreviewSent] = useState(false);

  const greeting = `Hi ${patient.patientName.split(" ")[0]} 👋`;

  return (
    <dialog
      open
      className="fixed inset-0 z-[60] m-auto w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-[var(--radius-lg)]">
        {/* WhatsApp-style header */}
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
            {patient.patientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{patient.patientName}</p>
            <p className="truncate text-xs text-white/80">{formatPhone(patient.patientPhone)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat area */}
        <div
          className="flex-1 space-y-3 overflow-y-auto p-4"
          style={{
            backgroundColor: "#ECE5DD",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        >
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm shadow-sm">
              <p className="text-[var(--text-muted)] text-xs mb-1">{clinicName}</p>
              <p>
                {greeting} This is {clinicName}. We hope you&apos;re doing well!
              </p>
              {patient.visitReason !== "—" && (
                <p className="mt-2 text-[var(--text-secondary)]">
                  Last visit: {formatLastVisit(patient.lastVisitAt, patient.daysSinceVisit)}
                  {patient.visitReason !== "General consultation" && (
                    <> · {patient.visitReason}</>
                  )}
                </p>
              )}
              {patient.dueAmount > 0 && (
                <p className="mt-1 text-amber-700 text-xs">
                  Outstanding: ₹{patient.dueAmount.toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </div>

          {message && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-lg rounded-tr-none bg-[#DCF8C6] px-3 py-2 text-sm shadow-sm whitespace-pre-wrap">
                {message}
                {previewSent && (
                  <p className="mt-1 text-right text-[10px] text-[var(--text-muted)]">✓ Sent</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Compose area */}
        <div className="border-t border-[var(--border)] bg-[var(--surface-1)] p-3 space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <details className="text-sm">
            <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--brand-600)]">
              <Sparkles className="inline h-3.5 w-3.5 mr-1" />
              AI instructions (optional)
            </summary>
            <textarea
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2 text-sm min-h-[50px]"
              placeholder='e.g. "Ask them to come for a dengue checkup this monsoon"'
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await generateRetentionMessageAction({
                    patientId: patient.patientId,
                    reminderType: patient.suggestedReminderType,
                    customInstructions: aiInstructions || undefined,
                  });
                  if (result.error) setError(result.error);
                  else if (result.message) {
                    setMessage(result.message);
                    setError(null);
                  }
                })
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate with AI
            </Button>
          </details>

          <div className="flex gap-2 items-end">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message… e.g. Come visit us again for your follow-up!"
              className="flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2.5 text-sm min-h-[44px] max-h-[120px] outline-none focus:border-[#075E54]"
              rows={2}
            />
            <Button
              loading={pending}
              disabled={!message.trim()}
              onClick={() =>
                startTransition(async () => {
                  const result = await sendRetentionMessageAction({
                    patientId: patient.patientId,
                    message,
                    reminderType: patient.suggestedReminderType,
                    reminderId: patient.reminderId,
                  });
                  if (result.error) {
                    setError(result.error);
                  } else {
                    setPreviewSent(true);
                    onSent(
                      `Message sent to ${patient.patientName}` +
                        (result.simulated ? " (simulated)" : "")
                    );
                    setTimeout(onClose, 800);
                  }
                })
              }
              className="shrink-0 rounded-full bg-[#075E54] hover:bg-[#064d45]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            Simple text message — no menu options. Patient can reply freely on WhatsApp.
          </p>
        </div>
      </div>
    </dialog>
  );
}
