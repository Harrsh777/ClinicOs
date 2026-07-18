import { aiChatCompletion, parseAIJson } from "@/lib/ai/client";
import type {
  EngagementMessageContext,
  EngagementReminderType,
  GeneratedEngagementMessage,
  InteractiveOption,
} from "@/lib/engagement/types";
import { REMINDER_TYPE_LABELS } from "@/lib/engagement/types";
import { formatReactivateMessage } from "@/lib/engagement/growth-messages";

const EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

function defaultOptions(reminderType: EngagementReminderType): InteractiveOption[] {
  if (reminderType === "medicine") {
    return [
      { id: 1, label: "Taking regularly", emoji: "1️⃣" },
      { id: 2, label: "Missed a few doses", emoji: "2️⃣" },
      { id: 3, label: "Side effects", emoji: "3️⃣" },
      { id: 4, label: "Need to talk to doctor", emoji: "4️⃣" },
    ];
  }
  if (reminderType === "birthday") {
    return [
      { id: 1, label: "Thank you!", emoji: "1️⃣" },
      { id: 2, label: "Book a check-up", emoji: "2️⃣" },
    ];
  }
  return [
    { id: 1, label: "Completely better", emoji: "1️⃣" },
    { id: 2, label: "Slight pain", emoji: "2️⃣" },
    { id: 3, label: "Still swollen / not improved", emoji: "3️⃣" },
    { id: 4, label: "Need doctor consultation", emoji: "4️⃣" },
  ];
}

function formatOptionsBlock(options: InteractiveOption[]): string {
  return options
    .map((o) => `${o.emoji ?? EMOJIS[o.id - 1] ?? `${o.id}.`} ${o.label}`)
    .join("\n");
}

function fallbackMessage(ctx: EngagementMessageContext): GeneratedEngagementMessage {
  const firstName = ctx.patientName.split(" ")[0] ?? ctx.patientName;
  const options = defaultOptions(ctx.reminderType);
  const typeLabel = REMINDER_TYPE_LABELS[ctx.reminderType];

  let body = `Hello ${firstName},\n\n`;

  if (ctx.reminderType === "clinical_follow_up" || ctx.reminderType === "physiotherapy") {
    const condition = ctx.diagnosis?.trim() || ctx.complaint?.trim() || "your recent visit";
    body += `We hope you're recovering well from ${condition}.\n\n`;
    if (ctx.followUpDate) {
      body += `This is a reminder that your follow-up is on ${ctx.followUpDate}`;
      if (ctx.doctorName) body += ` with Dr. ${ctx.doctorName}`;
      body += ".\n\n";
    }
    body += `How are you feeling?\n\n`;
  } else if (ctx.reminderType === "medicine") {
    body += `This is a gentle reminder about your medicines from ${ctx.clinicName}.\n\nHow is your medication going?\n\n`;
  } else if (ctx.reminderType === "birthday") {
    body += `Happy Birthday from all of us at ${ctx.clinicName}! 🎂\n\nWishing you great health.\n\n`;
  } else if (ctx.reminderType === "inactive_patient") {
    return {
      message: formatReactivateMessage({
        clinicName: ctx.clinicName,
        patientName: ctx.patientName,
      }),
      options: [
        { id: 1, label: "Book a checkup", emoji: "1️⃣" },
        { id: 2, label: "Remind me later", emoji: "2️⃣" },
        { id: 3, label: "Not interested", emoji: "3️⃣" },
      ],
    };
  } else {
    body += `${typeLabel} reminder from ${ctx.clinicName}.\n\n`;
    if (ctx.advice) body += `${ctx.advice}\n\n`;
    body += `Please let us know how you're doing:\n\n`;
  }

  body += formatOptionsBlock(options);

  return { message: body.trim(), options };
}

export async function generateEngagementMessage(
  clinicId: string,
  ctx: EngagementMessageContext
): Promise<GeneratedEngagementMessage> {
  const fallback = fallbackMessage(ctx);

  // Keep reactivation copy consistent (growth automation)
  if (ctx.reminderType === "inactive_patient" || ctx.reminderType === "birthday") {
    return fallback;
  }

  const result = await aiChatCompletion({
    clinicId,
    feature: "engagement_message",
    jsonMode: true,
    maxTokens: 600,
    systemPrompt: `You write warm, concise WhatsApp health messages for an Indian clinic. Use simple English. Be caring, not robotic. Never give new medical advice — only remind and ask status.

You must read the patient's complaint and diagnosis to understand why they visited, then ask condition-specific recovery questions and offer tailored quick-reply options.`,
    userPrompt: `Create a personalized WhatsApp reminder.

Patient: ${ctx.patientName}
Chief complaint / symptoms: ${ctx.complaint ?? "—"}
Diagnosis: ${ctx.diagnosis ?? "—"}
Doctor: ${ctx.doctorName ?? "—"}
Follow-up date: ${ctx.followUpDate ?? "—"}
Advice given: ${ctx.advice ?? "—"}
Clinic: ${ctx.clinicName}
Reminder type: ${ctx.reminderType}

Step 1: Infer why the patient visited from complaint + diagnosis.
Step 2: Write a message referencing their specific condition (not generic "recent visit").
Step 3: Ask questions relevant to that condition.
Step 4: Provide 4 quick-reply options specific to their condition.

Return JSON only:
{
  "message": "natural multi-line WhatsApp message with condition-specific questions",
  "options": [
    {"id": 1, "label": "short option", "emoji": "1️⃣"},
    {"id": 2, "label": "...", "emoji": "2️⃣"},
    {"id": 3, "label": "...", "emoji": "3️⃣"},
    {"id": 4, "label": "...", "emoji": "4️⃣"}
  ]
}

Examples: ankle sprain → swelling/mobility options; fever → temperature/cough options; diabetes → sugar control options. Keep message under 120 words.`,
    metadata: { reminderType: ctx.reminderType },
  });

  if (!result) return fallback;

  const parsed = parseAIJson<{ message: string; options: InteractiveOption[] }>(result.content);
  if (!parsed?.message) return fallback;

  const options = (parsed.options ?? fallback.options).slice(0, 4).map((o, i) => ({
    id: o.id ?? i + 1,
    label: o.label,
    emoji: o.emoji ?? EMOJIS[i],
  }));

  const message = `${parsed.message.trim()}\n\n${formatOptionsBlock(options)}`;
  return { message, options };
}

export function appendOptionsToMessage(
  message: string,
  options: InteractiveOption[]
): string {
  if (message.includes("1️⃣") || message.includes("1.")) return message;
  return `${message.trim()}\n\n${formatOptionsBlock(options)}`;
}
