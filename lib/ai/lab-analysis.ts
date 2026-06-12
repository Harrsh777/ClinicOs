import type { LabTest } from "@/lib/types/clinical";

interface LabAnalysisInput {
  testNames: string[];
  resultValues?: Record<string, string | number>;
  rawText?: string;
}

interface LabAnalysisResult {
  summary: string;
  abnormalFlags: Record<string, { value: string | number; status: "high" | "low" | "normal"; note: string }>;
  tokensUsed: number;
}

const REFERENCE_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  glucose: { min: 70, max: 100, unit: "mg/dL" },
  "blood sugar": { min: 70, max: 100, unit: "mg/dL" },
  cholesterol: { min: 0, max: 200, unit: "mg/dL" },
  hemoglobin: { min: 12, max: 17, unit: "g/dL" },
  hb: { min: 12, max: 17, unit: "g/dL" },
};

function ruleBasedAnalysis(input: LabAnalysisInput): LabAnalysisResult {
  const flags: LabAnalysisResult["abnormalFlags"] = {};
  const notes: string[] = [];

  if (input.resultValues) {
    for (const [key, val] of Object.entries(input.resultValues)) {
      const range = REFERENCE_RANGES[key.toLowerCase()];
      const numVal = typeof val === "number" ? val : parseFloat(String(val));
      if (!range || isNaN(numVal)) continue;

      if (numVal > range.max) {
        flags[key] = { value: numVal, status: "high", note: `Above normal (${range.max} ${range.unit})` };
        notes.push(`${key} is elevated at ${numVal} ${range.unit} (normal up to ${range.max}).`);
      } else if (numVal < range.min) {
        flags[key] = { value: numVal, status: "low", note: `Below normal (${range.min} ${range.unit})` };
        notes.push(`${key} is lower than normal at ${numVal} ${range.unit}.`);
      } else {
        flags[key] = { value: numVal, status: "normal", note: "Within normal range" };
      }
    }
  }

  const summary =
    notes.length > 0
      ? notes.join(" ")
      : `Lab results for ${input.testNames.join(", ")} have been recorded. Please consult your doctor for interpretation.`;

  return { summary, abnormalFlags: flags, tokensUsed: 0 };
}

export async function analyzeLabResults(
  clinicId: string,
  input: LabAnalysisInput
): Promise<LabAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return ruleBasedAnalysis(input);
  }

  try {
    const prompt = `You are a medical lab assistant. Explain these lab results in plain language for a patient. Be concise (2-4 sentences). Flag anything abnormal.

Tests: ${input.testNames.join(", ")}
Values: ${JSON.stringify(input.resultValues ?? {})}
${input.rawText ? `Additional text: ${input.rawText}` : ""}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      }),
    });

    if (!res.ok) throw new Error("OpenAI API error");

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content ?? ruleBasedAnalysis(input).summary;
    const tokensUsed = data.usage?.total_tokens ?? 0;
    const ruleResult = ruleBasedAnalysis(input);

    return { summary, abnormalFlags: ruleResult.abnormalFlags, tokensUsed };
  } catch {
    return ruleBasedAnalysis(input);
  }
}
