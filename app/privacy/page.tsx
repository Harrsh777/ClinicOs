import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ClinicOS collects, uses, and protects patient and clinic data.",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Last updated: June 2026</p>

        <div className="prose prose-slate mt-8 max-w-none">
          <p>
            ClinicOS (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting patient and clinic data in compliance
            with applicable healthcare privacy regulations, including principles aligned with India&apos;s Digital Personal
            Data Protection Act and healthcare data handling best practices.
          </p>

          <h2>Data We Collect</h2>
          <ul>
            <li>Patient health records, vitals, prescriptions, and consultation notes</li>
            <li>Appointment, queue, and billing information</li>
            <li>Account credentials, staff roles, and clinic configuration data</li>
            <li>Usage analytics to improve platform reliability and performance</li>
          </ul>

          <h2>How We Use Data</h2>
          <p>
            Data is used solely to provide clinic management services. AI features process data to assist clinicians —
            outputs are always reviewed by licensed professionals before clinical use. We do not sell patient data to
            third parties.
          </p>

          <h2>Data Sharing</h2>
          <p>
            We share data only when required to deliver the service (e.g. payment processors, SMS/WhatsApp providers),
            when legally required, or with your explicit consent. All subprocessors are bound by confidentiality and
            security obligations.
          </p>

          <h2>Data Security</h2>
          <p>
            All data is encrypted in transit (TLS) and at rest. Row-level security ensures multi-tenant isolation.
            Access is role-based, logged, and audited. Regular security reviews and backups are performed.
          </p>

          <h2>Your Rights</h2>
          <p>
            Clinic administrators may request access, correction, or deletion of account data subject to legal retention
            requirements for medical records. Patients should contact their clinic directly for record-related requests.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy inquiries:{" "}
            <a href="mailto:privacy@clinicos.ai" className="text-[var(--brand-600)] hover:underline">
              privacy@clinicos.ai
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface-0)]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-[var(--text-secondary)]">
          <span>© 2026 ClinicOS Technologies Pvt. Ltd.</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/terms" className="hover:text-[var(--text-primary)] hover:underline">
              Terms of Service
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
