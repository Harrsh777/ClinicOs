export function buildFollowUpQuestion(medicineName: string): string {
  return `Hi! This is a follow-up from your clinic. Are you taking ${medicineName} regularly as prescribed? Reply YES or NO.`;
}

export function parseFollowUpResponse(message: string): "yes" | "no" | "unknown" {
  const text = message.trim().toLowerCase();
  if (/^(yes|y|haan|ha|ok|okay|regularly)/i.test(text)) return "yes";
  if (/^(no|n|nahi|not|stopped|skip)/i.test(text)) return "no";
  return "unknown";
}

export function getFollowUpStatus(
  response: "yes" | "no" | "unknown"
): "adherence_yes" | "adherence_no" | "responded" {
  if (response === "yes") return "adherence_yes";
  if (response === "no") return "adherence_no";
  return "responded";
}
