import { createServiceClient } from "@/lib/supabase/server";

export type AIFeature =
  | "scribe"
  | "lab_analysis"
  | "appointment_bot"
  | "whatsapp_concierge"
  | "billing_assistant"
  | "follow_up"
  | "health_risk"
  | "engagement_message"
  | "recovery_analysis"
  | "patient_brief"
  | "doctor_assistant"
  | "dashboard_insights";

const COST_PER_1K_TOKENS = 0.00015;

export async function logAIUsage(
  clinicId: string,
  feature: AIFeature,
  tokensUsed: number,
  metadata: Record<string, unknown> = {}
) {
  try {
    const service = await createServiceClient();
    await service.from("ai_usage_logs").insert({
      clinic_id: clinicId,
      feature,
      tokens_used: tokensUsed,
      cost_estimate: (tokensUsed / 1000) * COST_PER_1K_TOKENS,
      metadata,
    });
  } catch {
    // Non-blocking — analytics should not break primary flows
  }
}
