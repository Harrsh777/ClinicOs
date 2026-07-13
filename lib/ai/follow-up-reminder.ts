export function formatClinicalFollowUpReminder(params: {
  patientName: string;
  diagnosis: string;
  clinicName: string;
}): string {
  const firstName = params.patientName.split(" ")[0] ?? params.patientName;
  const condition = params.diagnosis.trim() || "your recent visit";

  return [
    `Hello ${firstName} 👋`,
    "",
    `We hope you're recovering well from ${condition}.`,
    "",
    "This is a reminder that your follow-up appointment is tomorrow.",
    "",
    `We look forward to seeing you at ${params.clinicName}.`,
  ].join("\n");
}
