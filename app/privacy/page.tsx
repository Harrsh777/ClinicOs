import Link from "next/link";
import { Activity } from "lucide-react";

export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <p className="text-[var(--text-secondary)]">Last updated: June 2026</p>
        <p>ClinicOS (&quot;we&quot;, &quot;our&quot;) is committed to protecting patient and clinic data in compliance with applicable healthcare privacy regulations.</p>
        <h2>Data We Collect</h2>
        <ul>
          <li>Patient health records, vitals, and consultation notes</li>
          <li>Appointment and billing information</li>
          <li>Account credentials and clinic configuration data</li>
        </ul>
        <h2>How We Use Data</h2>
        <p>Data is used solely to provide clinic management services. AI features process data to assist clinicians — outputs are always reviewed by licensed professionals before clinical use.</p>
        <h2>Data Security</h2>
        <p>All data is encrypted in transit and at rest. Row-level security ensures multi-tenant isolation. Access is role-based and audited.</p>
        <h2>Contact</h2>
        <p>For privacy inquiries: <a href="mailto:privacy@clinicos.ai">privacy@clinicos.ai</a></p>
      </main>
    </div>
  );
}
