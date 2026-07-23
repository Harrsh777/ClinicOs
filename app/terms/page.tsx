import Link from "next/link";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Terms of Service — ClinicOS Clinic Growth Software",
  description:
    "Terms governing use of ClinicOS, India's first AI-powered clinic growth software for doctors and clinic owners.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-1)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface-0)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2e63ff] to-[#6c7bff] text-white shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-4 w-4">
                <path d="M12 4v16M4 12h16" />
              </svg>
            </span>
            <span className="font-bold text-[var(--text-primary)]">ClinicOS</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-[var(--brand-600)] hover:underline">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Terms of Service</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Last updated: June 2026</p>

        <div className="prose prose-slate mt-8 max-w-none">
          <p>
            By using ClinicOS, you agree to these terms. ClinicOS is a SaaS platform for clinic operations — not a
            substitute for professional medical judgment.
          </p>

          <h2>Service Description</h2>
          <p>
            ClinicOS provides appointment management, EMR, billing, telemedicine, and AI-assisted tools for licensed
            healthcare providers and their authorised staff.
          </p>

          <h2>AI Disclaimer</h2>
          <p>
            AI-generated content (scribe notes, lab summaries, billing insights, follow-up messages) is assistive only.
            Clinicians must review and approve all clinical outputs before they are used with patients.
          </p>

          <h2>Account Responsibilities</h2>
          <p>
            Clinic owners are responsible for staff access, patient consent, accurate record-keeping, and compliance
            with local healthcare regulations.
          </p>

          <h2>Availability &amp; Support</h2>
          <p>
            We strive for high availability but do not guarantee uninterrupted service. Planned maintenance will be
            communicated in advance where possible.
          </p>

          <h2>Contact</h2>
          <p>
            For support:{" "}
            <a href="mailto:support@clinicos.ai" className="text-[var(--brand-600)] hover:underline">
              support@clinicos.ai
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface-0)]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-[var(--text-secondary)]">
          <span>© 2026 ClinicOS Technologies Pvt. Ltd.</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="hover:text-[var(--text-primary)] hover:underline">
              Privacy Policy
            </Link>
            <a
              href="https://harshsrivastava.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)] hover:underline"
            >
              Founded by Harsh Srivastava
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
