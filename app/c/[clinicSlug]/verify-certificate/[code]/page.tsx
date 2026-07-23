import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ShieldCheck, AlertOctagon, CheckCircle2, Building2, User, Calendar, FileText } from "lucide-react";
import { verifyCertificatePublicAction } from "@/lib/actions/medical-certificates";

export default async function PublicVerifyCertificatePage({
  params,
}: {
  params: Promise<{ clinicSlug: string; code: string }>;
}) {
  const { code } = await params;
  const cert = await verifyCertificatePublicAction(code);

  if (!cert) {
    notFound();
  }

  const patient = cert.patients as { full_name?: string; patient_code?: string; gender?: string; date_of_birth?: string } | null;
  const doctor = cert.profiles as { full_name?: string; specialization?: string; staff_code?: string } | null;
  const clinic = cert.clinics as { name?: string; address?: string; city?: string; state?: string; phone?: string; email?: string; clinic_code?: string } | null;

  const isValid = cert.status === "issued";

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 flex flex-col items-center justify-center font-sans text-slate-100">
      <div className="w-full max-w-xl space-y-6">
        {/* Top Official Verification Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">Official Document Verification</h1>
          <p className="text-xs text-slate-400">ClinicOS Official Verification Registry</p>
        </div>

        {/* Verification Status Card */}
        <div className={`rounded-2xl border p-6 shadow-2xl backdrop-blur-md ${isValid ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200" : "border-red-500/30 bg-red-950/40 text-red-200"}`}>
          <div className="flex items-center gap-4">
            {isValid ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-400 shrink-0" />
            ) : (
              <AlertOctagon className="h-10 w-10 text-red-400 shrink-0" />
            )}
            <div>
              <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${isValid ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-red-500/20 text-red-300 border border-red-500/40"}`}>
                {isValid ? "AUTHENTIC & VALID CERTIFICATE" : "REVOKED CERTIFICATE"}
              </span>
              <p className="text-sm font-mono font-bold mt-1 text-white">{cert.certificate_code}</p>
            </div>
          </div>
          {!isValid && cert.revoked_reason && (
            <p className="mt-3 text-xs text-red-300 border-t border-red-500/20 pt-2">
              <strong>Revocation Reason:</strong> {cert.revoked_reason}
            </p>
          )}
        </div>

        {/* Certificate Details Container */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-6 space-y-5 text-xs">
          {/* Clinic Section */}
          <div className="flex items-start gap-3 border-b border-slate-700/60 pb-4">
            <Building2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Issuing Medical Institution</p>
              <p className="text-sm font-bold text-white mt-0.5">{clinic?.name ?? "ClinicOS Center"}</p>
              <p className="text-slate-400">{[clinic?.address, clinic?.city, clinic?.state].filter(Boolean).join(", ")}</p>
              <p className="text-slate-400 font-mono mt-0.5">{clinic?.phone && `Phone: ${clinic.phone}`} {clinic?.email && `· Email: ${clinic.email}`}</p>
            </div>
          </div>

          {/* Patient & Doctor */}
          <div className="grid grid-cols-2 gap-4 border-b border-slate-700/60 pb-4">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Patient Name</p>
                <p className="font-bold text-white mt-0.5">{patient?.full_name ?? "—"}</p>
                {patient?.patient_code && <p className="text-[10px] font-mono text-slate-400">ID: {patient.patient_code}</p>}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Issuing Physician</p>
                <p className="font-bold text-white mt-0.5">Dr. {doctor?.full_name ?? "Physician"}</p>
                <p className="text-[10px] text-slate-400">{doctor?.specialization ?? "General Practitioner"}</p>
              </div>
            </div>
          </div>

          {/* Clinical Dates & Diagnosis */}
          <div className="grid grid-cols-2 gap-4 border-b border-slate-700/60 pb-4">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Issue Date</p>
                <p className="font-bold text-white mt-0.5">{format(new Date(cert.issued_at), "dd MMMM yyyy")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Expiry / Fitness Date</p>
                <p className="font-bold text-white mt-0.5">{cert.expiry_date ? format(new Date(cert.expiry_date), "dd MMMM yyyy") : "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Clinical Impression */}
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Diagnosis / Clinical Reason</p>
              <p className="font-medium text-slate-200 mt-0.5">{cert.diagnosis ?? "Not Specified"}</p>
              {cert.rest_duration_days != null && (
                <p className="text-[11px] text-amber-400 font-medium mt-1">Recommended Medical Rest: {cert.rest_duration_days} Day(s)</p>
              )}
            </div>
          </div>
        </div>

        {/* Security Signature Hash */}
        <div className="text-center space-y-1 text-[10px] text-slate-500 font-mono">
          <p>Digital Cryptographic Hash: {cert.qr_verification_token}</p>
          <p>© {new Date().getFullYear()} ClinicOS Healthcare Infrastructure · All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
}
