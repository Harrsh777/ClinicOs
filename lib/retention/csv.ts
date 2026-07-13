/** Parse retention CSV text into rows. Tolerates header row and quoted fields. */
export function parseRetentionCsv(text: string): {
  rows: Array<Record<string, string>>;
  errors: string[];
} {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: ["CSV file is empty"] };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const required = ["full_name", "phone"];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) {
    return { rows: [], errors: [`Missing required columns: ${missing.join(", ")}`] };
  }

  const rows: Array<Record<string, string>> = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.every((v) => !v.trim())) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim();
    });

    if (!row.full_name?.trim()) {
      errors.push(`Row ${i + 1}: full_name is required`);
      continue;
    }
    if (!row.phone?.trim()) {
      errors.push(`Row ${i + 1}: phone is required`);
      continue;
    }

    rows.push(row);
  }

  return { rows, errors };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function buildRetentionCsvTemplate(): string {
  return [
    "full_name,phone,last_visit_date,visit_reason,due_amount",
    "Rahul Sharma,9876543210,2025-06-12,Dental checkup,500",
    "Priya Patel,9123456789,2025-03-01,Fever follow-up,0",
  ].join("\n");
}

export function parseDueAmount(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const cleaned = value.replace(/[₹,\s]/g, "");
  const num = Number(cleaned);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100) / 100;
}

export function parseVisitDate(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const slash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const year =
      slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    const month = slash[2].padStart(2, "0");
    const day = slash[1].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}
