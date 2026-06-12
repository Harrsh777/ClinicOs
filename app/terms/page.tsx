import Link from "next/link";
import { Activity } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-1)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface-0)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-500)]">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">ClinicOS</span>
          </Link>
          <Link href="/" className="text-sm text-[var(--brand-600)] hover:underline">Back to home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12 prose prose-slate">
        <h1>Terms of Service</h1>
        <p className="text-[var(--text-secondary)]">Last updated: June 2026</p>
        <p>By using ClinicOS, you agree to these terms. ClinicOS is a SaaS platform for clinic operations — not a substitute for professional medical judgment.</p>
        <h2>Service Description</h2>
        <p>ClinicOS provides appointment management, EMR, billing, telemedicine, and AI-assisted tools for licensed healthcare providers.</p>
        <h2>AI Disclaimer</h2>
        <p>AI-generated content (scribe notes, lab summaries, billing insights) is assistive only. Clinicians must review and approve all clinical outputs.</p>
        <h2>Account Responsibilities</h2>
        <p>Clinic owners are responsible for staff access, patient consent, and compliance with local healthcare regulations.</p>
        <h2>Contact</h2>
        <p>For support: <a href="mailto:support@clinicos.ai">support@clinicos.ai</a></p>
      </main>
    </div>
  );
}
