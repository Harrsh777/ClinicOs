"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addRetentionPatientAction,
  importRetentionPatientsAction,
} from "@/lib/actions/patient-retention";
import { buildRetentionCsvTemplate } from "@/lib/retention/csv";

interface RetentionImportPanelProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function RetentionImportPanel({ onClose, onSuccess }: RetentionImportPanelProps) {
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"add" | "import">("add");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    visitReason: "",
    lastVisitDate: "",
    dueAmount: "",
  });

  function downloadTemplate() {
    const blob = new Blob([buildRetentionCsvTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retention-patients-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleAdd() {
    startTransition(async () => {
      setError(null);
      const result = await addRetentionPatientAction({
        fullName: form.fullName,
        phone: form.phone,
        visitReason: form.visitReason || undefined,
        lastVisitDate: form.lastVisitDate || undefined,
        dueAmount: form.dueAmount ? Number(form.dueAmount) : undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess(`Added ${form.fullName} to retention list`);
        onClose();
      }
    });
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      startTransition(async () => {
        setError(null);
        const result = await importRetentionPatientsAction(text);
        const msg =
          `Imported ${result.imported} patient${result.imported === 1 ? "" : "s"}` +
          (result.skipped ? `, ${result.skipped} skipped` : "") +
          (result.errors.length ? `. ${result.errors.slice(0, 3).join("; ")}` : "");
        if (result.imported === 0 && result.errors.length) {
          setError(result.errors.join("; "));
        } else {
          onSuccess(msg);
          onClose();
        }
      });
    };
    reader.readAsText(file);
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-[60] m-auto w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Add patients</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--surface-2)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-[var(--border)] pb-3">
          <button
            type="button"
            onClick={() => setTab("add")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === "add"
                ? "bg-[var(--brand-500)] text-white"
                : "bg-[var(--surface-2)] text-[var(--text-muted)]"
            }`}
          >
            <Plus className="inline h-3.5 w-3.5 mr-1" />
            Add one
          </button>
          <button
            type="button"
            onClick={() => setTab("import")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === "import"
                ? "bg-[var(--brand-500)] text-white"
                : "bg-[var(--surface-2)] text-[var(--text-muted)]"
            }`}
          >
            <Upload className="inline h-3.5 w-3.5 mr-1" />
            Import CSV
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {tab === "add" ? (
          <div className="space-y-3">
            <Input
              label="Full name *"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Rahul Sharma"
            />
            <Input
              label="Phone *"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="9876543210"
            />
            <Input
              label="Last visit reason"
              value={form.visitReason}
              onChange={(e) => setForm((f) => ({ ...f, visitReason: e.target.value }))}
              placeholder="Dental checkup, fever follow-up…"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Last visit date"
                type="date"
                value={form.lastVisitDate}
                onChange={(e) => setForm((f) => ({ ...f, lastVisitDate: e.target.value }))}
              />
              <Input
                label="Due amount (₹)"
                type="number"
                min={0}
                value={form.dueAmount}
                onChange={(e) => setForm((f) => ({ ...f, dueAmount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                loading={pending}
                disabled={!form.fullName.trim() || !form.phone.trim()}
                onClick={handleAdd}
              >
                Add patient
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Download the template, fill in patient details, and upload. Existing phone numbers
              will be updated with new data.
            </p>
            <Button variant="secondary" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download CSV template
            </Button>
            <div
              className="rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center cursor-pointer hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)] transition-colors"
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <Upload className="mx-auto h-8 w-8 text-[var(--text-muted)] mb-2" />
              <p className="text-sm font-medium">Click to upload CSV</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Columns: full_name, phone, last_visit_date, visit_reason, due_amount
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
