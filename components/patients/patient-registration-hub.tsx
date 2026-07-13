"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Heart,
  MapPin,
  Phone,
  Upload,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { createPatientAction, bulkImportPatientsAction } from "@/lib/actions/patients";
import { buildPatientCsvTemplate, PATIENT_CSV_COLUMNS, parsePatientCsv } from "@/lib/patients/csv";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Mode = "single" | "bulk";
type BulkStep = "upload" | "preview" | "done";

interface PatientRegistrationHubProps {
  basePath?: string;
  backHref?: string;
}

const GENDER_OPTIONS = [
  { value: "", label: "Select gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const BLOOD_GROUP_OPTIONS = [
  { value: "", label: "Select blood group" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
];

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-[var(--border)] bg-[var(--surface-1)] px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export function PatientRegistrationHub({
  basePath = "/owner/patients",
  backHref = "/owner/patients",
}: PatientRegistrationHubProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("single");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const [bulkStep, setBulkStep] = useState<BulkStep>("upload");
  const [csvText, setCsvText] = useState("");
  const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleSingleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createPatientAction(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.patientId) {
      router.push(`${basePath}/${result.patientId}`);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([buildPatientCsvTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patient-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const processCsvFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const { rows, errors } = parsePatientCsv(text);
      setCsvText(text);
      setPreviewRows(rows);
      setPreviewErrors(errors);
      setImportResult(null);
      setBulkStep(rows.length > 0 ? "preview" : "upload");
      if (rows.length === 0 && errors.length) {
        setError(errors.join("; "));
      } else {
        setError(null);
      }
    };
    reader.readAsText(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      processCsvFile(file);
    } else {
      setError("Please upload a valid CSV file");
    }
  }

  function handleBulkImport() {
    startTransition(async () => {
      setError(null);
      const result = await bulkImportPatientsAction(csvText);
      setImportResult(result);
      setBulkStep("done");
      if (result.imported === 0 && result.errors.length) {
        setError(result.errors.slice(0, 3).join("; "));
      }
    });
  }

  function resetBulk() {
    setBulkStep("upload");
    setCsvText("");
    setPreviewRows([]);
    setPreviewErrors([]);
    setImportResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--brand-600)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to patients
        </Link>

        <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setMode("single");
              setError(null);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              mode === "single"
                ? "bg-[var(--brand-500)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            )}
          >
            <UserPlus className="h-4 w-4" />
            Single patient
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("bulk");
              setError(null);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              mode === "bulk"
                ? "bg-[var(--brand-500)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            )}
          >
            <Users className="h-4 w-4" />
            Bulk upload
          </button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {mode === "single" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <form onSubmit={handleSingleSubmit} className="space-y-5">
            <SectionCard icon={User} title="Personal details" description="Basic identity and demographics">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full Name *" name="fullName" required placeholder="Raj Kumar" />
                <Input label="Phone *" name="phone" required placeholder="9876543210" />
                <Input label="Email" name="email" type="email" placeholder="raj@email.com" />
                <Input label="Date of Birth" name="dateOfBirth" type="date" />
                <Select label="Gender" name="gender" options={GENDER_OPTIONS} />
                <Select label="Blood Group" name="bloodGroup" options={BLOOD_GROUP_OPTIONS} />
              </div>
            </SectionCard>

            <SectionCard icon={MapPin} title="Address" description="Where the patient can be reached">
              <Input label="Full Address" name="address" placeholder="House no., street, city, pin code" />
            </SectionCard>

            <SectionCard
              icon={Heart}
              title="Emergency & additional info"
              description="Safety contacts and internal notes"
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Emergency Contact Name" name="emergencyContactName" placeholder="Family member name" />
                  <Input
                    label="Emergency Contact Phone"
                    name="emergencyContactPhone"
                    placeholder="9876501234"
                  />
                </div>
                <Input
                  label="Aadhaar (last 4 digits only)"
                  name="aadhaarLastFour"
                  maxLength={4}
                  placeholder="1234"
                />
                <Textarea label="Notes" name="notes" placeholder="Allergies, preferences, or other notes..." />
              </div>
            </SectionCard>

            <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] p-4 shadow-sm">
              <Link href={backHref}>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={loading} size="lg">
                <UserPlus className="h-4 w-4" />
                Register patient
              </Button>
            </div>
          </form>

          <aside className="space-y-4">
            <Card className="bg-gradient-to-br from-[var(--brand-50)] to-[var(--surface-0)]">
              <div className="flex items-center gap-2 text-[var(--brand-700)]">
                <Phone className="h-4 w-4" />
                <span className="text-sm font-semibold">Quick tips</span>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-2">
                  <span className="text-[var(--brand-500)]">•</span>
                  Phone number must be a valid 10-digit Indian mobile
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--brand-500)]">•</span>
                  Each phone can only be registered once per clinic
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--brand-500)]">•</span>
                  A unique patient code is auto-generated on save
                </li>
              </ul>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm font-medium">Registering many patients?</span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Switch to bulk upload to import dozens of patients from a CSV spreadsheet.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setMode("bulk")}
              >
                <Upload className="h-4 w-4" />
                Use bulk upload
              </Button>
            </Card>
          </aside>
        </div>
      ) : (
        <div className="space-y-5">
          {bulkStep === "upload" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { step: 1, label: "Download template", desc: "Get the CSV format" },
                  { step: 2, label: "Fill patient data", desc: "Add rows in Excel or Sheets" },
                  { step: 3, label: "Upload & import", desc: "Review before confirming" },
                ].map((s) => (
                  <Card key={s.step} className="relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--brand-500)] to-cyan-400 opacity-60" />
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-500)] text-sm font-bold text-white">
                        {s.step}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{s.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{s.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">CSV template</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Required columns: <Badge variant="brand">full_name</Badge>{" "}
                      <Badge variant="brand">phone</Badge>
                    </p>
                  </div>
                  <Button variant="secondary" onClick={downloadTemplate}>
                    <Download className="h-4 w-4" />
                    Download template
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {PATIENT_CSV_COLUMNS.map((col) => (
                    <span
                      key={col.key}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        col.required
                          ? "bg-[var(--brand-50)] text-[var(--brand-700)]"
                          : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                      )}
                    >
                      {col.label}
                      {col.required && " *"}
                    </span>
                  ))}
                </div>
              </Card>

              <div
                className={cn(
                  "rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer",
                  dragOver
                    ? "border-[var(--brand-400)] bg-[var(--brand-50)] scale-[1.01]"
                    : "border-[var(--border)] hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)]/50"
                )}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-600)]">
                  <Upload className="h-8 w-8" />
                </div>
                <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                  Drop your CSV here or click to browse
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Supports .csv files · Duplicate phone numbers will be skipped
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processCsvFile(file);
                  }}
                />
              </div>
            </>
          )}

          {bulkStep === "preview" && (
            <>
              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">Review import</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {previewRows.length} patient{previewRows.length !== 1 ? "s" : ""} ready to import
                      {previewErrors.length > 0 && (
                        <span className="text-amber-600">
                          {" "}
                          · {previewErrors.length} row{previewErrors.length !== 1 ? "s" : ""} with issues
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={resetBulk}>
                      <X className="h-4 w-4" />
                      Choose different file
                    </Button>
                    <Button loading={pending} onClick={handleBulkImport} disabled={previewRows.length === 0}>
                      <CheckCircle2 className="h-4 w-4" />
                      Import {previewRows.length} patient{previewRows.length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </div>
              </Card>

              {previewErrors.length > 0 && (
                <Alert variant="error">
                  <div className="space-y-1">
                    <p className="font-medium">Some rows were skipped during parsing:</p>
                    <ul className="list-disc pl-4 text-sm">
                      {previewErrors.slice(0, 5).map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                      {previewErrors.length > 5 && (
                        <li>…and {previewErrors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </Alert>
              )}

              <Card padding={false} className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Blood</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.slice(0, 50).map((row, idx) => (
                        <TableRow key={`${row.phone}-${idx}`}>
                          <TableCell className="text-[var(--text-muted)]">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{row.full_name}</TableCell>
                          <TableCell>{row.phone}</TableCell>
                          <TableCell className="text-[var(--text-muted)]">{row.email || "—"}</TableCell>
                          <TableCell className="capitalize">{row.gender || "—"}</TableCell>
                          <TableCell>{row.blood_group || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {previewRows.length > 50 && (
                  <p className="border-t border-[var(--border)] px-5 py-3 text-sm text-[var(--text-muted)]">
                    Showing first 50 of {previewRows.length} rows
                  </p>
                )}
              </Card>
            </>
          )}

          {bulkStep === "done" && importResult && (
            <Card className="text-center py-10">
              <div
                className={cn(
                  "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
                  importResult.imported > 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                )}
              >
                {importResult.imported > 0 ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : (
                  <AlertCircle className="h-8 w-8" />
                )}
              </div>
              <h3 className="mt-4 text-xl font-semibold">
                {importResult.imported > 0 ? "Import complete" : "No patients imported"}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                <span className="font-semibold text-emerald-600">{importResult.imported}</span> imported
                {importResult.skipped > 0 && (
                  <>
                    {" "}
                    · <span className="font-semibold text-amber-600">{importResult.skipped}</span> skipped
                  </>
                )}
              </p>

              {importResult.errors.length > 0 && (
                <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
                  <p className="font-medium mb-1">Issues encountered:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {importResult.errors.slice(0, 5).map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>…and {importResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="secondary" onClick={resetBulk}>
                  Import more
                </Button>
                <Link href={backHref}>
                  <Button>
                    View all patients
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
