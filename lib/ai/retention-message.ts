import { aiChatCompletion, parseAIJson } from "@/lib/ai/client";
import { generateEngagementMessage } from "@/lib/ai/engagement-message";
import type { EngagementReminderType, InteractiveOption } from "@/lib/engagement/types";
import { REMINDER_TYPE_LABELS } from "@/lib/engagement/types";

const OPTION_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

export interface RetentionMessageInput {
  patientName: string;
  visitReason?: string | null;
  complaint?: string | null;
  diagnosis?: string | null;
  doctorName?: string | null;
  followUpDate?: string | null;
  advice?: string | null;
  clinicName: string;
  reminderType: EngagementReminderType;
  daysSinceVisit?: number | null;
  customInstructions?: string;
}

function formatOptionsBlock(options: InteractiveOption[]): string {
  return options
    .map((o, i) => `${o.emoji ?? OPTION_EMOJIS[i] ?? `${o.id}.`} ${o.label}`)
    .join("\n");
}

function resolveVisitReason(input: RetentionMessageInput): string {
  return (
    input.visitReason?.trim() ||
    input.complaint?.trim() ||
    input.diagnosis?.trim() ||
    "recent visit"
  );
}

function buildRetentionPrompt(input: RetentionMessageInput): string {
  const visitReason = resolveVisitReason(input);
  const reminderLabel = REMINDER_TYPE_LABELS[input.reminderType];

  return `Create a personalized WhatsApp follow-up for a patient who visited our clinic.

PATIENT CONTEXT
- Name: ${input.patientName}
- Primary reason for last visit: ${visitReason}
- Symptoms / chief complaint: ${input.complaint?.trim() || "Not recorded separately"}
- Diagnosis from visit: ${input.diagnosis?.trim() || "Not recorded"}
- Treating doctor: ${input.doctorName?.trim() || "Not specified"}
- Days since last visit: ${input.daysSinceVisit ?? "Unknown"}
- Scheduled follow-up date: ${input.followUpDate?.trim() || "None on record"}
- Advice given at visit: ${input.advice?.trim() || "None recorded"}
- Clinic name: ${input.clinicName}
- Outreach purpose: ${reminderLabel}

INSTRUCTIONS
1. First understand WHY the patient visited — use the visit reason, complaint, and diagnosis together.
2. Open with a warm greeting using their first name.
3. Reference their specific visit reason naturally (e.g. "your knee pain", "your diabetes review", "your child's fever") — do NOT use generic phrasing like "your recent visit" if a specific reason is known.
4. Ask 1–2 check-in questions tailored to THAT condition (recovery progress, symptom status, medicine adherence, readings, etc.).
5. If a follow-up date exists, mention it gently.
6. If they have been inactive (90+ days), add a friendly nudge to book a visit.
7. End with quick-reply options the patient can tap — each option must relate to their specific condition.

${input.customInstructions?.trim() ? `ADDITIONAL STAFF INSTRUCTIONS:\n${input.customInstructions.trim()}\n` : ""}
Return JSON only:
{
  "message": "multi-line WhatsApp message with condition-specific questions (no numbered options inside message)",
  "options": [
    {"id": 1, "label": "short condition-specific reply", "emoji": "1️⃣"},
    {"id": 2, "label": "...", "emoji": "2️⃣"},
    {"id": 3, "label": "...", "emoji": "3️⃣"},
    {"id": 4, "label": "...", "emoji": "4️⃣"}
  ]
}

Examples of good option tailoring:
- Fever/cold → "Fever gone", "Still have fever", "Cough persists", "Need to see doctor"
- Ankle sprain → "Much better", "Still swollen", "Pain when walking", "Need physiotherapy"
- Diabetes → "Sugar under control", "Readings high", "Side effects from medicine", "Want to book review"
- Pregnancy → "Doing well", "Have concerns", "Need appointment", "Speak to doctor"

Keep the message under 130 words. Never give new medical advice.`;
}

const RETENTION_SYSTEM_PROMPT = `You write warm, concise WhatsApp health follow-ups for an Indian clinic.

Your messages must feel personal because you understood the patient's visit reason — symptoms, diagnosis, and why they came.

Always:
- Tie questions to their specific condition or visit reason
- Offer quick-reply options that match what a real patient would answer for that condition
- Use simple English, caring tone, no medical jargon unless the diagnosis uses it
- Never prescribe, diagnose, or give new medical advice — only check in and encourage follow-up`;

/** AI-generated retention message via Gemini (falls back to engagement template). */
export async function generateRetentionMessage(
  clinicId: string,
  input: RetentionMessageInput
): Promise<{ message: string }> {
  const visitReason = resolveVisitReason(input);

  const engagementFallback = await generateEngagementMessage(clinicId, {
    patientName: input.patientName,
    complaint: input.complaint ?? visitReason,
    diagnosis: input.diagnosis,
    doctorName: input.doctorName,
    followUpDate: input.followUpDate,
    advice: input.advice,
    clinicName: input.clinicName,
    reminderType: input.reminderType,
  });

  const result = await aiChatCompletion({
    clinicId,
    feature: "engagement_message",
    jsonMode: true,
    maxTokens: 700,
    systemPrompt: RETENTION_SYSTEM_PROMPT,
    userPrompt: buildRetentionPrompt(input),
    metadata: {
      source: "retention_dashboard",
      reminderType: input.reminderType,
      visitReason,
    },
  });

  if (!result) {
    return { message: engagementFallback.message };
  }

  const parsed = parseAIJson<{ message: string; options: InteractiveOption[] }>(result.content);
  if (!parsed?.message?.trim()) {
    return { message: engagementFallback.message };
  }

  const options = (parsed.options ?? engagementFallback.options)
    .slice(0, 4)
    .map((o, i) => ({
      id: o.id ?? i + 1,
      label: o.label,
      emoji: o.emoji ?? OPTION_EMOJIS[i],
    }));

  const message = `${parsed.message.trim()}\n\n${formatOptionsBlock(options)}`;
  return { message };
}
