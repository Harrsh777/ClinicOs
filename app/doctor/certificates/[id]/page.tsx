import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ShieldCheck, Mail, AlertTriangle, Clock, History } from "lucide-react";
import { getIssuedCertificateById, revokeCertificateAction, sendCertificateEmailAction } from "@/lib/actions/medical-certificates";
import { CertificatePreview } from "@/components/certificates/certificate-preview";

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getIssuedCertificateById(id);

  if (!result || !result.certificate) {
    notFound();
  }

  const { certificate, auditLogs } = result;

  async function handleSendEmail(formData: FormData) {
    "use server";
    const recipientEmail = formData.get("email") as string;
    if (recipientEmail) {
      await sendCertificateEmailAction(id, recipientEmail);
    }
  }

  async function handleRevoke(formData: FormData) {
    "use server";
    await revokeCertificateAction(formData);
  }

  return (
    <div className="space-y-8">
      {/* Top Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4 print:hidden">
        <div>
          <Link href="/doctor/certificates" className="text-xs text-[var(--text-muted)] hover:underline">
            ← Back to All Certificates
          </Link>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mt-1">
            Certificate {certificate.certificate_code}
          </h1>
        </div>

        {/* Email & Revoke Forms */}
        <div className="flex flex-wrap items-center gap-3">
          <form action={handleSendEmail} className="flex gap-2">
            <input
              type="email"
              name="email"
              defaultValue={certificate.patients?.email ?? ""}
              placeholder="Patient Email..."
              required
              className="clinic-input text-xs w-48"
            />
            <button type="submit" className="clinic-btn clinic-btn-secondary gap-1.5 text-xs">
              <Mail className="h-3.5 w-3.5" /> Email Patient
            </button>
          </form>

          {certificate.status === "issued" && (
            <form action={handleRevoke}>
              <input type="hidden" name="certificateId" value={certificate.id} />
              <button
                type="submit"
                className="rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors gap-1 flex items-center"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Revoke Certificate
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main Certificate Render Component */}
      <CertificatePreview certificate={certificate} />

      {/* Audit Log & Version History Timeline */}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm print:hidden">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-teal-600" /> Certificate Audit Trail & Security History
        </h3>

        <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
          {auditLogs.map((log) => (
            <div key={log.id} className="relative pl-6">
              <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white bg-teal-600" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800 capitalize">
                  {log.action.replace(/_/g, " ")}
                </p>
                <span className="text-[10px] text-slate-500">
                  {format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Performed by: <span className="font-medium text-slate-900">{log.profiles?.full_name ?? "System / QR Scanner"}</span>
              </p>
              {log.details && (
                <pre className="mt-2 rounded-lg bg-slate-50 p-2 font-mono text-[10px] text-slate-600 overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
