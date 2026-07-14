import { aiChatCompletion, parseAIJson } from "@/lib/ai/client";
import type { EngagementReminderType } from "@/lib/engagement/types";
import { REMINDER_TYPE_LABELS } from "@/lib/engagement/types";
import type { RetentionMessageInput } from "@/lib/ai/retention-message";

function resolveVisitReason(input: RetentionMessageInput): string {
  return (
    input.visitReason?.trim() ||
    input.complaint?.trim() ||
    input.diagnosis?.trim() ||
    "recent visit"
  );
}

function buildFallbackEmail(input: RetentionMessageInput) {
  const firstName = input.patientName.split(" ")[0];
  const visitReason = resolveVisitReason(input);
  const reminderLabel = REMINDER_TYPE_LABELS[input.reminderType].toLowerCase();

  return {
    subject: `${input.clinicName} — follow-up regarding your ${visitReason}`,
    body: `Hi ${firstName},

We hope you are doing well since your visit to ${input.clinicName} for ${visitReason}.

This is a gentle reminder about your ${reminderLabel}. If you have any concerns, changes in symptoms, or need to book an appointment, please reply to this email or call the clinic.

Warm regards,
${input.clinicName}`,
  };
}

function buildRetentionEmailPrompt(input: RetentionMessageInput): string {
  const visitReason = resolveVisitReason(input);
  const reminderLabel = REMINDER_TYPE_LABELS[input.reminderType];

  return `Write a personalized patient retention email for an Indian clinic.

PATIENT CONTEXT
- Name: ${input.patientName}
- Visit reason: ${visitReason}
- Complaint: ${input.complaint?.trim() || "Not recorded"}
- Diagnosis: ${input.diagnosis?.trim() || "Not recorded"}
- Doctor: ${input.doctorName?.trim() || "Not specified"}
- Days since last visit: ${input.daysSinceVisit ?? "Unknown"}
- Follow-up date: ${input.followUpDate?.trim() || "None"}
- Clinic: ${input.clinicName}
- Purpose: ${reminderLabel}

INSTRUCTIONS
1. Write a warm, professional email — not a WhatsApp message.
2. Reference their specific visit reason naturally.
3. Ask 1–2 condition-specific check-in questions.
4. Encourage booking a follow-up if appropriate.
5. No numbered quick-reply options. No emojis unless very subtle.
6. Subject line should be specific and under 70 characters.
7. Body should be 2–4 short paragraphs, plain text with line breaks.

${input.customInstructions?.trim() ? `STAFF INSTRUCTIONS:\n${input.customInstructions.trim()}\n` : ""}
Return JSON only:
{
  "subject": "email subject line",
  "body": "plain text email body with paragraph breaks"
}`;
}

const RETENTION_EMAIL_SYSTEM = `You write warm, professional healthcare follow-up emails for Indian clinics.

Use clear English, a caring tone, and reference the patient's specific visit reason.
Never prescribe, diagnose, or give new medical advice — only check in and encourage follow-up.`;

export async function generateRetentionEmail(
  clinicId: string,
  input: RetentionMessageInput
): Promise<{ subject: string; body: string }> {
  const fallback = buildFallbackEmail(input);

  const result = await aiChatCompletion({
    clinicId,
    feature: "engagement_message",
    jsonMode: true,
    maxTokens: 800,
    systemPrompt: RETENTION_EMAIL_SYSTEM,
    userPrompt: buildRetentionEmailPrompt(input),
    metadata: {
      source: "retention_email",
      reminderType: input.reminderType,
    },
  });

  if (!result) return fallback;

  const parsed = parseAIJson<{ subject: string; body: string }>(result.content);
  if (!parsed?.subject?.trim() || !parsed?.body?.trim()) return fallback;

  return {
    subject: parsed.subject.trim(),
    body: parsed.body.trim(),
  };
}
