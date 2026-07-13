import { aiChatCompletion, parseAIJson } from "@/lib/ai/client";
import type { PatientAIBrief } from "@/lib/engagement/types";

export interface PatientBriefInput {
  patientName: string;
  emrRecords: Array<{
    visit_number: number;
    created_at: string;
    summary: Record<string, unknown>;
  }>;
  activeMedicines: string[];
  reminders: Array<{
    follow_up_date: string;
    status: string;
    diagnosis: string | null;
    patient_response: string | null;
    recovery_analysis: Record<string, unknown> | null;
    responded_at: string | null;
  }>;
  missedAppointments: Array<{ date: string; status: string }>;
}

function ruleBasedBrief(input: PatientBriefInput): PatientAIBrief {
  const latest = input.emrRecords[0];
  const summary = (latest?.summary ?? {}) as {
    diagnosis?: string;
    advice?: string;
    follow_up_date?: string;
  };

  const responses = input.reminders
    .filter((r) => r.patient_response)
    .map((r) => ({
      date: r.responded_at ?? r.follow_up_date,
      response: r.patient_response!,
      recovery_status: (r.recovery_analysis as { recovery_status?: string })?.recovery_status,
      priority: (r.recovery_analysis as { priority?: string })?.priority,
    }));

  const attention = input.reminders
    .filter((r) => (r.recovery_analysis as { doctor_attention_required?: boolean })?.doctor_attention_required)
    .map((r) => `${r.diagnosis ?? "Follow-up"}: ${(r.recovery_analysis as { summary?: string })?.summary ?? r.patient_response}`);

  return {
    previous_diagnosis: summary.diagnosis ?? "No prior diagnosis recorded",
    recovery_progress: responses.length
      ? responses[0].recovery_status ?? responses[0].response
      : "No patient responses yet",
    current_medications: input.activeMedicines.length ? input.activeMedicines : ["None on record"],
    missed_follow_ups: input.missedAppointments.map((a) => `${a.date} (${a.status})`),
    patient_responses: responses,
    doctor_attention_items: attention,
    summary: `${input.patientName} — last diagnosis: ${summary.diagnosis ?? "—"}. ${responses.length ? `Latest patient update: ${responses[0].response}` : "Awaiting follow-up response."}`,
  };
}

export async function generatePatientAIBrief(
  clinicId: string,
  input: PatientBriefInput
): Promise<PatientAIBrief> {
  const fallback = ruleBasedBrief(input);

  const emrText = input.emrRecords
    .slice(0, 5)
    .map((r) => {
      const s = r.summary as Record<string, string | undefined>;
      return `Visit #${r.visit_number} (${r.created_at.slice(0, 10)}): complaint=${s.symptoms ?? "—"}, diagnosis=${s.diagnosis ?? "—"}, advice=${s.advice ?? "—"}`;
    })
    .join("\n");

  const reminderText = input.reminders
    .slice(0, 5)
    .map((r) =>
      `Follow-up ${r.follow_up_date} [${r.status}]: ${r.patient_response ?? "no reply"} ${JSON.stringify(r.recovery_analysis ?? {})}`
    )
    .join("\n");

  const result = await aiChatCompletion({
    clinicId,
    feature: "patient_brief",
    jsonMode: true,
    maxTokens: 800,
    systemPrompt: `You prepare a concise clinical brief for a doctor opening a patient chart. Use bullet-style strings. Highlight risks and missed follow-ups. Indian clinic context.`,
    userPrompt: `Patient: ${input.patientName}

Recent visits:
${emrText || "None"}

Medicines: ${input.activeMedicines.join(", ") || "None"}

Follow-up reminders & responses:
${reminderText || "None"}

Missed appointments: ${input.missedAppointments.map((a) => a.date).join(", ") || "None"}

Return JSON:
{
  "previous_diagnosis": "string",
  "recovery_progress": "string",
  "current_medications": ["string"],
  "missed_follow_ups": ["string"],
  "patient_responses": [{"date":"ISO","response":"string","recovery_status":"string","priority":"low|medium|high"}],
  "doctor_attention_items": ["string"],
  "summary": "2-3 sentence executive summary for the doctor"
}`,
    metadata: { emrCount: input.emrRecords.length },
  });

  if (!result) return fallback;

  const parsed = parseAIJson<PatientAIBrief>(result.content);
  if (!parsed?.summary) return fallback;

  return {
    previous_diagnosis: parsed.previous_diagnosis ?? fallback.previous_diagnosis,
    recovery_progress: parsed.recovery_progress ?? fallback.recovery_progress,
    current_medications: parsed.current_medications?.length
      ? parsed.current_medications
      : fallback.current_medications,
    missed_follow_ups: parsed.missed_follow_ups ?? fallback.missed_follow_ups,
    patient_responses: parsed.patient_responses?.length
      ? parsed.patient_responses
      : fallback.patient_responses,
    doctor_attention_items: parsed.doctor_attention_items ?? fallback.doctor_attention_items,
    summary: parsed.summary,
  };
}
