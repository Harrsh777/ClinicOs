"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCertificateTemplates, getDoctorSignatures, issueCertificateAction } from "@/lib/actions/medical-certificates";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { CertificateSignature, CertificateTemplate, Patient } from "@/lib/types/database";

export default function NewCertificatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTemplateId = searchParams.get("templateId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [signatures, setSignatures] = useState<CertificateSignature[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId ?? "");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [restDurationDays, setRestDurationDays] = useState<number>(3);
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState<string>(() =>
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );
  const [selectedSignatureUrl, setSelectedSignatureUrl] = useState<string>("");
  const [selectedStampUrl, setSelectedStampUrl] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const [{ data: pts }, tmpls, sigs] = await Promise.all([
        supabase.from("patients").select("*").order("full_name").limit(100),
        getCertificateTemplates(),
        getDoctorSignatures(),
      ]);

      setPatients((pts ?? []) as Patient[]);
      setTemplates(tmpls);
      setSignatures(sigs);

      if (tmpls.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(tmpls[0]!.id);
      }
      if (sigs.length > 0) {
        const sig = sigs.find((s) => s.asset_type === "digital_signature" || s.asset_type === "handwritten_signature");
        if (sig) setSelectedSignatureUrl(sig.file_path);
        const stamp = sigs.find((s) => s.asset_type === "clinic_stamp");
        if (stamp) setSelectedStampUrl(stamp.file_path);
      }
    }
    loadData();
  }, []);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
  const activePatient = patients.find((p) => p.id === selectedPatientId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("templateId", selectedTemplateId);
    fd.set("patientId", selectedPatientId);
    fd.set("diagnosis", diagnosis);
    fd.set("restDurationDays", String(restDurationDays));
    fd.set("issueDate", issueDate);
    fd.set("expiryDate", expiryDate);
    if (selectedSignatureUrl) fd.set("signatureUrl", selectedSignatureUrl);
    if (selectedStampUrl) fd.set("stampUrl", selectedStampUrl);

    const result = await issueCertificateAction(fd);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.certificateId) {
      router.push(`/doctor/certificates/${result.certificateId}`);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Issue Medical Certificate</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Fill in clinical details, select a patient, and issue an official verified certificate.
          </p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        {/* Left Form Column */}
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Certificate & Patient Details</h3>

          {/* Template Picker */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Select Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="clinic-input w-full"
              required
            >
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.title} ({tmpl.category.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          </div>

          {/* Patient Selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Select Patient</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="clinic-input w-full"
              required
            >
              <option value="">-- Choose Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} {p.patient_code ? `(${p.patient_code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Clinical Inputs */}
          <Input
            label="Diagnosis / Clinical Impression"
            name="diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Acute Bronchitis / Rest Recommended"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Rest Duration (Days)"
              type="number"
              min="0"
              name="restDurationDays"
              value={restDurationDays}
              onChange={(e) => {
                const days = Number(e.target.value);
                setRestDurationDays(days);
                const exp = new Date(new Date(issueDate).getTime() + days * 86400000);
                setExpiryDate(exp.toISOString().slice(0, 10));
              }}
            />
            <Input
              label="Issue Date"
              type="date"
              name="issueDate"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Expected Fitness / Expiry Date"
            type="date"
            name="expiryDate"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />

          {/* Signature Asset Selector */}
          {signatures.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Attach Doctor Digital Signature
              </label>
              <select
                value={selectedSignatureUrl}
                onChange={(e) => setSelectedSignatureUrl(e.target.value)}
                className="clinic-input w-full text-xs"
              >
                <option value="">No signature image attached</option>
                {signatures.map((sig) => (
                  <option key={sig.id} value={sig.file_path}>
                    {sig.title} ({sig.asset_type.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
            <Button type="submit" loading={loading} className="w-full">
              Issue Official Medical Certificate
            </Button>
          </div>
        </div>

        {/* Right Preview Column */}
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-slate-50 p-6">
          <h3 className="text-sm font-bold text-slate-900">Certificate Live Preview</h3>
          {activeTemplate ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-800 space-y-3">
              <p className="text-center font-bold text-slate-900 text-sm uppercase">{activeTemplate.title}</p>
              <div
                dangerouslySetInnerHTML={{
                  __html: activeTemplate.content_html
                    .replaceAll("{{patient_name}}", activePatient?.full_name ?? "[Patient Name]")
                    .replaceAll("{{patient_age}}", "30")
                    .replaceAll("{{patient_gender}}", activePatient?.gender ?? "N/A")
                    .replaceAll("{{patient_address}}", activePatient?.address ?? "N/A")
                    .replaceAll("{{patient_id}}", activePatient?.patient_code ?? "PAT-XXXX")
                    .replaceAll("{{doctor_name}}", "Attending Doctor")
                    .replaceAll("{{clinic_name}}", "ClinicOS Medical Center")
                    .replaceAll("{{diagnosis}}", diagnosis || "[Diagnosis]")
                    .replaceAll("{{rest_days}}", String(restDurationDays))
                    .replaceAll("{{issue_date}}", issueDate)
                    .replaceAll("{{expiry_date}}", expiryDate || "N/A")
                    .replaceAll("{{certificate_id}}", "CERT-PREVIEW"),
                }}
              />
              {selectedSignatureUrl && (
                <div className="mt-4 border-t border-slate-200 pt-2">
                  <p className="text-[10px] text-slate-500 font-medium">Digital Signature Attached:</p>
                  <img src={selectedSignatureUrl} alt="Signature" className="h-10 object-contain mt-1" />
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">Select a template to view live preview</div>
          )}
        </div>
      </form>
    </div>
  );
}
