import Link from "next/link";
import { getCertificateTemplates, getDoctorSignatures } from "@/lib/actions/medical-certificates";
import { PageHeader } from "@/components/ui/card";
import { CertificateEditor } from "@/components/certificates/certificate-editor";
import { SignatureUploader } from "@/components/certificates/signature-uploader";

export default async function CertificateTemplatesPage() {
  const [templates, signatures] = await Promise.all([
    getCertificateTemplates(),
    getDoctorSignatures(),
  ]);

  const systemTemplates = templates.filter((t) => t.is_system);
  const customTemplates = templates.filter((t) => !t.is_system);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Certificate Template Library"
        subtitle="Manage pre-built templates, custom HTML builders, and doctor digital signature assets"
        action={
          <Link href="/doctor/certificates" className="clinic-btn clinic-btn-secondary text-xs">
            ← Back to Issued Certificates
          </Link>
        }
      />

      {/* Signature Uploader Section */}
      <SignatureUploader existingSignatures={signatures} />

      {/* System Templates Library */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Pre-Built System Templates</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systemTemplates.map((tmpl) => (
            <div key={tmpl.id} className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800 border border-teal-200">
                    {tmpl.category.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">System Standard</span>
                </div>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">{tmpl.title}</h4>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{tmpl.description ?? "Standard official certificate format."}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <Link href={`/doctor/certificates/new?templateId=${tmpl.id}`} className="clinic-btn clinic-btn-primary w-full text-center text-xs">
                  Use This Template
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Clinic Templates */}
      {customTemplates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Your Clinic Custom Templates</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customTemplates.map((tmpl) => (
              <div key={tmpl.id} className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
                <div>
                  <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-800 border border-purple-200">
                    Custom Template
                  </span>
                  <h4 className="font-bold text-sm text-[var(--text-primary)] mt-2">{tmpl.title}</h4>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{tmpl.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex gap-2">
                  <Link href={`/doctor/certificates/new?templateId=${tmpl.id}`} className="clinic-btn clinic-btn-primary flex-1 text-center text-xs">
                    Use Template
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Template Editor */}
      <CertificateEditor />
    </div>
  );
}
