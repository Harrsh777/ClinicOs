"use client";

import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { IssuedCertificate, Patient, Profile } from "@/lib/types/database";

interface CertificatePreviewProps {
  certificate: IssuedCertificate & {
    patients?: Patient;
    profiles?: Profile;
    clinics?: { name: string; address?: string; city?: string; state?: string; phone?: string; email?: string; clinic_code: string };
  };
  verifyUrl?: string;
  showPrintActions?: boolean;
}

export function CertificatePreview({ certificate, verifyUrl, showPrintActions = true }: CertificatePreviewProps) {
  const patient = certificate.patients;
  const doctor = certificate.profiles;
  const clinic = certificate.clinics;
  const qrUrl = verifyUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.growclinicos.com"}/c/verify-certificate/${certificate.qr_verification_token}`;

  const isRevoked = certificate.status === "revoked";

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-8 shadow-xl print:m-0 print:max-w-none print:shadow-none">
      {/* Optional Watermark */}
      {certificate.watermark_text && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04] select-none rotate-[-30deg]">
          <span className="text-6xl font-black uppercase text-slate-900 tracking-widest text-center whitespace-pre-wrap">
            {isRevoked ? "REVOKED CERTIFICATE" : certificate.watermark_text}
          </span>
        </div>
      )}

      {/* Revoked Banner Overlay */}
      {isRevoked && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <XCircle className="h-6 w-6 shrink-0 text-red-600" />
          <div>
            <p className="font-bold text-sm">THIS MEDICAL CERTIFICATE HAS BEEN REVOKED</p>
            <p className="text-xs text-red-600">
              Reason: {certificate.revoked_reason ?? "Revoked by issuing doctor"} · Revoked on {new Date(certificate.revoked_at!).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Clinic Header */}
      <div className="flex items-start justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{clinic?.name ?? "ClinicOS Medical Center"}</h1>
          <p className="text-sm text-slate-600">
            {[clinic?.address, clinic?.city, clinic?.state].filter(Boolean).join(", ") || "Healthcare & Clinical Services"}
          </p>
          <p className="text-xs text-slate-500">
            {clinic?.phone && `Tel: ${clinic.phone}`} {clinic?.email && `· Email: ${clinic.email}`} {clinic?.clinic_code && `· ID: ${clinic.clinic_code}`}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block rounded-md bg-teal-50 px-3 py-1 text-xs font-mono font-bold text-teal-800 border border-teal-200">
            {certificate.certificate_code}
          </span>
          <p className="mt-1 text-xs text-slate-500">Issued: {new Date(certificate.issued_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Certificate Main Content */}
      <div
        className="prose max-w-none py-8 text-slate-800"
        dangerouslySetInnerHTML={{ __html: certificate.rendered_html }}
      />

      {/* Signatures & Stamps Footer Section */}
      <div className="mt-8 grid grid-cols-2 items-end gap-6 border-t border-slate-200 pt-6">
        {/* Doctor Signature & Stamp */}
        <div className="space-y-2">
          {certificate.signature_url ? (
            <img
              src={certificate.signature_url}
              alt="Doctor Signature"
              className="h-16 object-contain"
            />
          ) : (
            <div className="h-12 border-b border-dashed border-slate-300" />
          )}
          <div>
            <p className="font-bold text-sm text-slate-900">Dr. {doctor?.full_name ?? "Attending Physician"}</p>
            <p className="text-xs text-slate-600">{doctor?.specialization ?? "General Practitioner"}</p>
            {doctor?.staff_code && <p className="text-xs text-slate-500 font-mono">Reg / Staff ID: {doctor.staff_code}</p>}
          </div>
        </div>

        {/* QR Code Verification */}
        <div className="flex flex-col items-end text-right">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <QRCodeSVG value={qrUrl} size={96} level="M" />
          </div>
          <p className="mt-2 text-[10px] text-slate-500 font-mono">Scan QR to verify authenticity</p>
          <p className="text-[10px] text-teal-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Official Digital Signature
          </p>
        </div>
      </div>

      {/* Print Controls (Hidden when printing) */}
      {showPrintActions && (
        <div className="mt-8 flex justify-end gap-3 print:hidden border-t border-slate-100 pt-4">
          <button
            onClick={() => window.print()}
            className="clinic-btn clinic-btn-primary gap-2 text-xs"
          >
            Print / Save PDF
          </button>
        </div>
      )}
    </div>
  );
}
