"use client";

import { useState } from "react";
import { saveCertificateTemplateAction } from "@/lib/actions/medical-certificates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { CertificateTemplate } from "@/lib/types/database";

const PLACEHOLDERS = [
  { tag: "{{patient_name}}", label: "Patient Name" },
  { tag: "{{patient_age}}", label: "Patient Age" },
  { tag: "{{patient_gender}}", label: "Gender" },
  { tag: "{{patient_address}}", label: "Address" },
  { tag: "{{patient_id}}", label: "Patient ID" },
  { tag: "{{doctor_name}}", label: "Doctor Name" },
  { tag: "{{clinic_name}}", label: "Clinic Name" },
  { tag: "{{diagnosis}}", label: "Diagnosis" },
  { tag: "{{rest_days}}", label: "Rest Days" },
  { tag: "{{issue_date}}", label: "Issue Date" },
  { tag: "{{expiry_date}}", label: "Expiry Date" },
  { tag: "{{certificate_id}}", label: "Certificate Code" },
];

interface CertificateEditorProps {
  initialTemplate?: CertificateTemplate | null;
  onSuccess?: () => void;
}

export function CertificateEditor({ initialTemplate, onSuccess }: CertificateEditorProps) {
  const [now] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentHtml, setContentHtml] = useState(
    initialTemplate?.content_html ??
      `<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
  <h2 style="text-align: center; color: #0f172a;">MEDICAL CERTIFICATE</h2>
  <p>This is to certify that <strong>{{patient_name}}</strong>, aged <strong>{{patient_age}}</strong> years, was clinically examined on <strong>{{issue_date}}</strong>.</p>
  <p><strong>Diagnosis:</strong> {{diagnosis}}</p>
  <p>Medical leave of <strong>{{rest_days}} day(s)</strong> is recommended starting from {{issue_date}}.</p>
</div>`
  );

  function insertTag(tag: string) {
    setContentHtml((prev) => prev + " " + tag);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("contentHtml", contentHtml);
    if (initialTemplate?.id) fd.set("id", initialTemplate.id);

    const result = await saveCertificateTemplateAction(fd);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      if (onSuccess) onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">
        {initialTemplate ? "Edit Certificate Template" : "Create New Custom Template"}
      </h2>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Template Title"
          name="title"
          defaultValue={initialTemplate?.title ?? ""}
          required
          placeholder="e.g. Sick Leave Certificate"
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Category</label>
          <select
            name="category"
            defaultValue={initialTemplate?.category ?? "sick_leave"}
            className="clinic-input w-full"
          >
            <option value="sick_leave">Sick Leave</option>
            <option value="fitness">Medical Fitness</option>
            <option value="medical_leave">Medical Leave</option>
            <option value="return_to_work">Return to Work</option>
            <option value="hospitalization">Hospitalization</option>
            <option value="vaccination">Vaccination</option>
            <option value="disability">Disability</option>
            <option value="pregnancy">Pregnancy / Maternity</option>
            <option value="travel_fitness">Travel Fitness</option>
            <option value="sports_fitness">Sports Fitness</option>
            <option value="custom">Custom Template</option>
          </select>
        </div>
      </div>

      <Input
        label="Description (Optional)"
        name="description"
        defaultValue={initialTemplate?.description ?? ""}
        placeholder="Brief note on when to use this template"
      />

      {/* Dynamic Insert Tag Buttons */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Insert Dynamic Variable Tag
        </label>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map((item) => (
            <button
              key={item.tag}
              type="button"
              onClick={() => insertTag(item.tag)}
              className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-mono text-teal-800 hover:bg-teal-100 transition-colors"
            >
              + {item.label} ({item.tag})
            </button>
          ))}
        </div>
      </div>

      {/* HTML Content Editor */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
          Template HTML Content
        </label>
        <textarea
          rows={10}
          value={contentHtml}
          onChange={(e) => setContentHtml(e.target.value)}
          className="clinic-input w-full font-mono text-xs leading-relaxed"
          required
        />
      </div>

      {/* Live Sample Preview */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Live Sample Preview
        </label>
        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm"
          dangerouslySetInnerHTML={{
            __html: contentHtml
              .replaceAll("{{patient_name}}", "John Doe")
              .replaceAll("{{patient_age}}", "32")
              .replaceAll("{{patient_gender}}", "Male")
              .replaceAll("{{patient_address}}", "123 Healthcare Ave, Delhi")
              .replaceAll("{{patient_id}}", "PAT-1024")
              .replaceAll("{{doctor_name}}", "Dr. Gunjan Batra")
              .replaceAll("{{clinic_name}}", "Gunjan Batra Clinic")
              .replaceAll("{{diagnosis}}", "Acute Viral Fever")
              .replaceAll("{{rest_days}}", "3")
              .replaceAll("{{issue_date}}", new Date(now).toLocaleDateString())
              .replaceAll("{{expiry_date}}", new Date(now + 3 * 86400000).toLocaleDateString())
              .replaceAll("{{certificate_id}}", "CERT-2026-00001"),
          }}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" loading={loading}>
          {initialTemplate ? "Update Template" : "Save Custom Template"}
        </Button>
      </div>
    </form>
  );
}
