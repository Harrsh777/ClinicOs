import { aiChatCompletion, parseAIJson } from "@/lib/ai/client";
import type { InteractiveOption, RecoveryAnalysis } from "@/lib/engagement/types";

function matchNumberedOption(
  reply: string,
  options: InteractiveOption[]
): InteractiveOption | null {
  const trimmed = reply.trim();
  const digit = trimmed.match(/^[1-4]$/)?.[0] ?? trimmed.match(/^([1-4])[.)]/)?.[1];
  if (digit) {
    const id = parseInt(digit, 10);
    return options.find((o) => o.id === id) ?? null;
  }

  const lower = trimmed.toLowerCase();
  for (const opt of options) {
    if (lower.includes(opt.label.toLowerCase())) return opt;
  }
  return null;
}

function ruleBasedAnalysis(
  reply: string,
  selectedOption: InteractiveOption | null,
  diagnosis?: string | null
): RecoveryAnalysis {
  const lower = reply.toLowerCase();

  if (selectedOption) {
    const label = selectedOption.label.toLowerCase();
    if (selectedOption.id === 1 || label.includes("better") || label.includes("thank")) {
      return {
        recovery_status: selectedOption.label,
        priority: "low",
        doctor_attention_required: false,
        summary: `Patient reports: ${selectedOption.label}`,
        selected_option_id: selectedOption.id,
      };
    }
    if (selectedOption.id === 4 || label.includes("doctor") || label.includes("consult")) {
      return {
        recovery_status: selectedOption.label,
        priority: "high",
        doctor_attention_required: true,
        summary: `Patient requests consultation: ${selectedOption.label}`,
        selected_option_id: selectedOption.id,
      };
    }
    if (selectedOption.id === 3 || label.includes("swollen") || label.includes("not improved")) {
      return {
        recovery_status: selectedOption.label,
        priority: "medium",
        doctor_attention_required: true,
        summary: `Patient not fully recovered: ${selectedOption.label}`,
        selected_option_id: selectedOption.id,
      };
    }
    return {
      recovery_status: selectedOption.label,
      priority: "medium",
      doctor_attention_required: false,
      summary: `Patient reports: ${selectedOption.label}`,
      selected_option_id: selectedOption.id,
    };
  }

  if (/better|fine|good|recovered|ok/.test(lower)) {
    return {
      recovery_status: "Improving",
      priority: "low",
      doctor_attention_required: false,
      summary: reply,
    };
  }
  if (/swollen|worse|severe|urgent|emergency|pain/.test(lower)) {
    return {
      recovery_status: reply.slice(0, 80),
      priority: /severe|urgent|emergency/.test(lower) ? "high" : "medium",
      doctor_attention_required: true,
      summary: `Patient concern regarding ${diagnosis ?? "condition"}: ${reply}`,
    };
  }

  return {
    recovery_status: reply.slice(0, 80) || "Unclear",
    priority: "medium",
    doctor_attention_required: false,
    summary: reply,
  };
}

export async function analyzeRecoveryReply(params: {
  clinicId: string;
  patientReply: string;
  options: InteractiveOption[];
  diagnosis?: string | null;
  complaint?: string | null;
}): Promise<RecoveryAnalysis> {
  const selected = matchNumberedOption(params.patientReply, params.options);
  const fallback = ruleBasedAnalysis(params.patientReply, selected, params.diagnosis);

  const result = await aiChatCompletion({
    clinicId: params.clinicId,
    feature: "recovery_analysis",
    jsonMode: true,
    maxTokens: 300,
    systemPrompt: `You analyze patient WhatsApp replies for a clinic. Output structured recovery assessment. Be conservative — flag doctor attention when symptoms persist or worsen.`,
    userPrompt: `Diagnosis: ${params.diagnosis ?? "unknown"}
Complaint: ${params.complaint ?? "unknown"}
Patient reply: ${params.patientReply}
${selected ? `Matched option: ${selected.label}` : "Free-text reply"}

Return JSON:
{
  "recovery_status": "short status label",
  "priority": "low|medium|high|critical",
  "doctor_attention_required": true/false,
  "summary": "one sentence for the doctor"
}`,
    metadata: { hasSelectedOption: !!selected },
  });

  if (!result) return { ...fallback, selected_option_id: selected?.id };

  const parsed = parseAIJson<RecoveryAnalysis>(result.content);
  if (!parsed?.recovery_status) {
    return { ...fallback, selected_option_id: selected?.id };
  }

  return {
    ...parsed,
    selected_option_id: selected?.id,
  };
}

export function parseInteractiveReply(
  reply: string,
  options: InteractiveOption[]
): { option: InteractiveOption | null; raw: string } {
  return { option: matchNumberedOption(reply, options), raw: reply.trim() };
}
