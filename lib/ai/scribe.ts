import { logAIUsage } from "@/lib/ai/usage-logger";

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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || transcript.trim().length < 10) {
    return ruleBasedScribe(transcript);
  }

  try {
    const prompt = `You are a medical scribe for an Indian clinic. Extract structured clinical data from this doctor-patient conversation transcript.

Return ONLY valid JSON with this shape:
{
  "symptoms": "string",
  "diagnosis": "string",
  "clinicalNotes": "string",
  "prescriptionDraft": [{"medicineName":"","dosage":"","frequency":"","duration":"","instructions":""}]
}

Transcript:
${transcript}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error("OpenAI API error");

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens ?? 0;
    const parsed = JSON.parse(content) as ScribeResult;

    await logAIUsage(clinicId, "scribe", tokensUsed, { transcriptLength: transcript.length });

    return { ...parsed, tokensUsed };
  } catch {
    return ruleBasedScribe(transcript);
  }
}
