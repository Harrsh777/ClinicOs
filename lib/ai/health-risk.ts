import { logAIUsage } from "@/lib/ai/usage-logger";

export interface HealthRiskFlag {
  riskType: string;
  severity: "low" | "medium" | "high" | "critical";
  details: Record<string, unknown>;
}

interface VitalsInput {
  weightKg?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  bloodSugar?: number | null;
  bmi?: number | null;
}

interface VitalsHistory {
  weightKg?: number | null;
  bpSystolic?: number | null;
  bloodSugar?: number | null;
  recordedAt: string;
}

export function analyzeHealthRisks(
  current: VitalsInput,
  history: VitalsHistory[] = []
): HealthRiskFlag[] {
  const flags: HealthRiskFlag[] = [];

  if (current.bpSystolic && current.bpSystolic >= 140) {
    flags.push({
      riskType: "Hypertension",
      severity: current.bpSystolic >= 160 ? "high" : "medium",
      details: { systolic: current.bpSystolic, diastolic: current.bpDiastolic },
    });
  }

  if (current.bloodSugar && current.bloodSugar >= 126) {
    flags.push({
      riskType: "High Diabetes Risk",
      severity: current.bloodSugar >= 200 ? "high" : "medium",
      details: { bloodSugar: current.bloodSugar },
    });
  }

  if (current.bmi && current.bmi >= 30) {
    flags.push({
      riskType: "Obesity Risk",
      severity: current.bmi >= 35 ? "high" : "medium",
      details: { bmi: current.bmi },
    });
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  if (sorted.length >= 3) {
    const weights = sorted.map((h) => h.weightKg).filter((w): w is number => w != null);
    if (weights.length >= 3) {
      const trend = weights[weights.length - 1] - weights[0];
      if (trend > 5) {
        flags.push({
          riskType: "Weight Gain Trend",
          severity: trend > 10 ? "high" : "medium",
          details: { gainKg: trend, readings: weights.length },
        });
      }
    }

    const sugars = sorted.map((h) => h.bloodSugar).filter((s): s is number => s != null);
    if (sugars.length >= 3 && sugars[sugars.length - 1] > sugars[0] + 20) {
      flags.push({
        riskType: "Rising Blood Sugar Trend",
        severity: "medium",
        details: { from: sugars[0], to: sugars[sugars.length - 1] },
      });
    }
  }

  return flags;
}

export async function analyzeHealthRisksWithAI(
  clinicId: string,
  patientName: string,
  current: VitalsInput,
  history: VitalsHistory[]
): Promise<HealthRiskFlag[]> {
  const ruleFlags = analyzeHealthRisks(current, history);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return ruleFlags;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Analyze vitals for ${patientName}. Current: ${JSON.stringify(current)}. History: ${JSON.stringify(history.slice(-5))}. Return JSON array of {riskType, severity, details}. Max 3 flags.`,
        }],
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return ruleFlags;

    const data = await res.json();
    const tokensUsed = data.usage?.total_tokens ?? 0;
    await logAIUsage(clinicId, "health_risk", tokensUsed);

    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const aiFlags = (parsed.flags ?? parsed.risks ?? []) as HealthRiskFlag[];
    if (aiFlags.length === 0) return ruleFlags;

    const merged = [...ruleFlags];
    for (const f of aiFlags) {
      if (!merged.some((m) => m.riskType === f.riskType)) merged.push(f);
    }
    return merged;
  } catch {
    return ruleFlags;
  }
}
