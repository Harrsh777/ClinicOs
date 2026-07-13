/** Parse patient registration CSV. Tolerates header row and quoted fields. */
export function parsePatientCsv(text: string): {
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

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/\s+/g, "_"));
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

export function buildPatientCsvTemplate(): string {
  return [
    "full_name,phone,email,date_of_birth,gender,blood_group,address,emergency_contact_name,emergency_contact_phone,aadhaar_last_four,notes",
    "Raj Kumar,9876543210,raj@email.com,1990-05-15,male,A+,12 MG Road Bangalore,Rajesh Kumar,9876501234,1234,Regular patient",
    "Priya Sharma,9123456789,,1985-08-22,female,B+,45 Park Street Mumbai,,,5678,",
  ].join("\n");
}

export const PATIENT_CSV_COLUMNS = [
  { key: "full_name", label: "Full Name", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "email", label: "Email", required: false },
  { key: "date_of_birth", label: "Date of Birth", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "blood_group", label: "Blood Group", required: false },
  { key: "address", label: "Address", required: false },
  { key: "emergency_contact_name", label: "Emergency Contact", required: false },
  { key: "emergency_contact_phone", label: "Emergency Phone", required: false },
  { key: "aadhaar_last_four", label: "Aadhaar (last 4)", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;
