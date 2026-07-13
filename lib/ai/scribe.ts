import { aiChatCompletion, parseAIJson } from "@/lib/ai/client";

export interface ScribeResult {
  symptoms: string;
  diagnosis: string;
  clinicalNotes: string;
  prescriptionDraft: {
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
  tokensUsed: number;
}

function ruleBasedScribe(transcript: string): ScribeResult {
  const lines = transcript.split(/[.!?]+/).filter(Boolean);
  const symptoms = lines.slice(0, 2).join(". ").trim() || transcript.slice(0, 200);
  return {
    symptoms,
    diagnosis: "Pending clinical review",
    clinicalNotes: `Transcript summary: ${transcript.slice(0, 500)}`,
    prescriptionDraft: [],
    tokensUsed: 0,
  };
}

export async function processScribeTranscript(
  clinicId: string,
  transcript: string
): Promise<ScribeResult> {
  if (transcript.trim().length < 10) {
    return ruleBasedScribe(transcript);
  }

  const result = await aiChatCompletion({
    clinicId,
    feature: "scribe",
    jsonMode: true,
    maxTokens: 800,
    systemPrompt:
      "You are a medical scribe for an Indian clinic. Extract structured clinical data from doctor-patient conversation transcripts. Return valid JSON only.",
    userPrompt: `Return JSON:
{
  "symptoms": "string",
  "diagnosis": "string",
  "clinicalNotes": "string",
  "prescriptionDraft": [{"medicineName":"","dosage":"","frequency":"","duration":"","instructions":""}]
}

Transcript:
${transcript}`,
    metadata: { transcriptLength: transcript.length },
  });

  if (!result) return ruleBasedScribe(transcript);

  const parsed = parseAIJson<ScribeResult>(result.content);
  if (!parsed?.symptoms) return ruleBasedScribe(transcript);

  return { ...parsed, tokensUsed: result.tokensUsed };
}
