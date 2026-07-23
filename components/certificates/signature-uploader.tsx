"use client";

import { useState } from "react";
import { Upload, CheckCircle2 } from "lucide-react";
import { uploadCertificateSignatureAction } from "@/lib/actions/medical-certificates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { CertificateSignature } from "@/lib/types/database";

interface SignatureUploaderProps {
  existingSignatures?: CertificateSignature[];
  onUploadSuccess?: () => void;
}

export function SignatureUploader({ existingSignatures = [], onUploadSuccess }: SignatureUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const fd = new FormData(e.currentTarget);
    const result = await uploadCertificateSignatureAction(fd);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccessMsg("Signature/stamp uploaded successfully!");
      if (onUploadSuccess) onUploadSuccess();
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-[var(--text-primary)]">Doctor Digital Signatures & Clinic Stamps</h3>
      <p className="text-xs text-[var(--text-secondary)]">
        Upload high-resolution transparent PNG images of handwritten signatures, digital signatures, or official clinic seals.
      </p>

      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      <form onSubmit={handleUpload} className="space-y-4 rounded-xl bg-[var(--surface-1)] p-4 border border-[var(--border)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Asset Title / Name" name="title" required placeholder="e.g. Dr. Batra Main Signature" />
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Asset Type</label>
            <select name="assetType" className="clinic-input w-full">
              <option value="digital_signature">Digital Signature</option>
              <option value="handwritten_signature">Handwritten Signature</option>
              <option value="clinic_stamp">Official Clinic Stamp / Seal</option>
              <option value="header_logo">Header Logo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Signature Image (PNG / JPG)</label>
          <input type="file" name="file" accept="image/*" required className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
        </div>

        <Button type="submit" loading={loading} className="gap-2 text-xs">
          <Upload className="h-4 w-4" /> Upload Signature Asset
        </Button>
      </form>

      {/* Existing Uploaded Signatures Grid */}
      {existingSignatures.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Saved Assets</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {existingSignatures.map((sig) => (
              <div key={sig.id} className="flex flex-col items-center justify-between rounded-xl border border-[var(--border)] bg-white p-3 text-center">
                <img src={sig.file_path} alt={sig.title} className="h-14 object-contain mb-2" />
                <p className="font-semibold text-xs text-[var(--text-primary)]">{sig.title}</p>
                <p className="text-[10px] text-teal-700 font-medium capitalize">{sig.asset_type.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
