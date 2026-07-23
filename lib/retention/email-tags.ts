import type { RetentionPatientRow } from "@/lib/retention/types";

export const RETENTION_EMAIL_TAGS = [
  { tag: "{name}", label: "Patient name" },
  { tag: "{dues}", label: "Outstanding dues" },
  { tag: "{problem}", label: "Visit reason / problem" },
  { tag: "{clinic}", label: "Clinic name" },
  { tag: "{last_visit}", label: "Last visit date" },
  { tag: "{doctor}", label: "Doctor name" },
  { tag: "{diagnosis}", label: "Diagnosis" },
] as const;

export type RetentionEmailTagVariables = {
  name: string;
  dues: string;
  problem: string;
  clinic: string;
  lastVisit: string;
  doctor: string;
  diagnosis: string;
};

function formatRetentionDues(amount: number): string {
  if (amount <= 0) return "no outstanding dues";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatRetentionLastVisit(date: string | null): string {
  if (!date) return "not yet recorded";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function buildRetentionEmailTagVariables(params: {
  patientName: string;
  visitReason?: string | null;
  diagnosis?: string | null;
  doctorName?: string | null;
  dueAmount?: number;
  lastVisitAt?: string | null;
  clinicName: string;
}): RetentionEmailTagVariables {
  const problem =
    params.visitReason?.trim() && params.visitReason !== "—"
      ? params.visitReason.trim()
      : "your recent visit";

  return {
    name: params.patientName,
    dues: formatRetentionDues(params.dueAmount ?? 0),
    problem,
    clinic: params.clinicName,
    lastVisit: formatRetentionLastVisit(params.lastVisitAt ?? null),
    doctor: params.doctorName?.trim() || "your doctor",
    diagnosis: params.diagnosis?.trim() || problem,
  };
}

export function retentionRowToTagVariables(
  row: RetentionPatientRow,
  clinicName: string
): RetentionEmailTagVariables {
  return buildRetentionEmailTagVariables({
    patientName: row.patientName,
    visitReason: row.visitReason,
    diagnosis: row.lastDiagnosis,
    doctorName: row.doctorName,
    dueAmount: row.dueAmount,
    lastVisitAt: row.lastVisitAt,
    clinicName,
  });
}

const TAG_ALIASES: Record<string, keyof RetentionEmailTagVariables> = {
  name: "name",
  dues: "dues",
  due: "dues",
  problem: "problem",
  visit_reason: "problem",
  reason: "problem",
  clinic: "clinic",
  last_visit: "lastVisit",
  lastvisit: "lastVisit",
  doctor: "doctor",
  diagnosis: "diagnosis",
};

export function applyRetentionEmailTags(text: string, vars: RetentionEmailTagVariables): string {
  return text.replace(/\{([a-z_]+)\}/gi, (match, rawKey: string) => {
    const key = TAG_ALIASES[rawKey.toLowerCase()];
    if (!key) return match;
    return vars[key];
  });
}
