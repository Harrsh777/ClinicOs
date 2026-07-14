"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ImagePlus,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateRetentionEmailAction,
  sendRetentionEmailAction,
} from "@/lib/actions/patient-retention";
import { filesToEmailAttachments } from "@/lib/retention/email-attachments";
import type { RetentionPatientRow } from "@/lib/retention/types";

interface RetentionEmailModalProps {
  patient: RetentionPatientRow;
  clinicName: string;
  onClose: () => void;
  onSent: (message: string) => void;
}

type LocalAttachment = {
  id: string;
  file: File;
  previewUrl: string;
};

const MAX_ATTACHMENTS = 5;

export function RetentionEmailModal({
  patient,
  clinicName,
  onClose,
  onSent,
}: RetentionEmailModalProps) {
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      attachments.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
    };
  }, [attachments]);

  const hasEmail = Boolean(patient.patientEmail);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      setError("Only image attachments are supported");
      return;
    }

    setError(null);
    setAttachments((current) => {
      const remaining = MAX_ATTACHMENTS - current.length;
      if (remaining <= 0) {
        setError(`Maximum ${MAX_ATTACHMENTS} images allowed`);
        return current;
      }

      const next = imageFiles.slice(0, remaining).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      if (imageFiles.length > remaining) {
        setError(`Only ${remaining} more image${remaining === 1 ? "" : "s"} can be attached`);
      }

      return [...current, ...next];
    });
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-[60] m-auto w-full max-w-3xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="flex max-h-[92vh] flex-col overflow-hidden rounded-[var(--radius-lg)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)]">New email</p>
            <p className="text-xs text-[var(--text-muted)] truncate">
              From {clinicName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              loading={pending}
              disabled={!hasEmail || !subject.trim() || !body.trim()}
              onClick={() =>
                startTransition(async () => {
                  const attachmentPayload = await filesToEmailAttachments(
                    attachments.map((item) => item.file)
                  );
                  const result = await sendRetentionEmailAction({
                    patientId: patient.patientId,
                    subject,
                    body,
                    attachments: attachmentPayload,
                  });
                  if (result.error) setError(result.error);
                  else {
                    onSent(`Email sent to ${patient.patientName}`);
                    onClose();
                  }
                })
              }
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {!hasEmail && (
            <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This patient has no email on file. Add their email in Patients before sending.
            </div>
          )}

          <div className="border-b border-[var(--border)] px-4 py-2.5 flex items-center gap-3">
            <span className="w-14 shrink-0 text-sm text-[var(--text-muted)]">To</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{patient.patientName}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {patient.patientEmail ?? "No email on file"}
              </p>
            </div>
          </div>

          <div className="border-b border-[var(--border)] px-4 py-2.5 flex items-center gap-3">
            <label htmlFor="retention-email-subject" className="w-14 shrink-0 text-sm text-[var(--text-muted)]">
              Subject
            </label>
            <input
              id="retention-email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Follow-up from your recent visit"
              disabled={!hasEmail}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            disabled={!hasEmail}
            className="min-h-[280px] w-full resize-y bg-white px-4 py-4 text-sm leading-relaxed outline-none placeholder:text-[var(--text-muted)]"
          />

          {attachments.length > 0 && (
            <div className="border-t border-[var(--border)] px-4 py-3">
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments ({attachments.length})
              </p>
              <div className="flex flex-wrap gap-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-1)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachment.previewUrl}
                      alt={attachment.file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                      aria-label={`Remove ${attachment.file.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--surface-1)] p-3 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!hasEmail || attachments.length >= MAX_ATTACHMENTS}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              Attach images
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!hasEmail}
              onClick={() => setShowAiPanel((open) => !open)}
            >
              <Sparkles className="h-4 w-4" />
              AI writer
            </Button>
          </div>

          {showAiPanel && (
            <div className="rounded-xl border border-[var(--border)] bg-white p-3 space-y-2">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Optional instructions for AI (tone, offer, season, etc.)
              </p>
              <textarea
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-2 text-sm min-h-[70px]"
                placeholder='e.g. "Invite them for a free BP checkup this Saturday"'
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
              />
              <Button
                variant="secondary"
                size="sm"
                loading={pending}
                disabled={!hasEmail}
                onClick={() =>
                  startTransition(async () => {
                    const result = await generateRetentionEmailAction({
                      patientId: patient.patientId,
                      reminderType: patient.suggestedReminderType,
                      customInstructions: aiInstructions || undefined,
                    });
                    if (result.error) setError(result.error);
                    else {
                      if (result.subject) setSubject(result.subject);
                      if (result.body) setBody(result.body);
                      setError(null);
                    }
                  })
                }
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate subject & body
              </Button>
            </div>
          )}

          <p className="text-[10px] text-[var(--text-muted)]">
            Images are embedded in the email and also attached for the patient to download.
          </p>
        </div>
      </div>
    </dialog>
  );
}
