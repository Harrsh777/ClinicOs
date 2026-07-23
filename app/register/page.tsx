import { Activity, CheckCircle2 } from "lucide-react";
import { ClinicRegistrationForm } from "@/components/register/clinic-registration-form";
import { createPageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Register Your Clinic — ClinicOS",
  description:
    "Register your clinic on ClinicOS, India's first clinic growth software. Start attracting more patients with AI-powered booking, follow-ups, and revenue growth tools.",
  path: "/register",
});

export default function RegisterPage() {
  return (
    <div className="clinic-auth-bg flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,.5)]">
        <div className="grid lg:grid-cols-[minmax(0,240px)_1fr]">
          <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[var(--primary)] to-slate-800 px-7 py-9 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(20,184,166,.3),transparent_18rem)]" />
            <div className="relative">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/15 ring-1 ring-teal-300/30">
                  <Activity className="h-5 w-5 text-[var(--secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">ClinicOS</p>
                  <p className="text-xs text-slate-400">Clinic registration</p>
                </div>
              </div>
              <h1 className="text-2xl font-bold leading-snug tracking-tight">Register your clinic</h1>
              <p className="mt-2 text-sm text-slate-300">
                Submit your clinic for admin approval. You&apos;ll receive login credentials once approved.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" />
                  Takes about 2 minutes
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" />
                  Admin review within 1–2 business days
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" />
                  No login until approved
                </li>
              </ul>
            </div>
          </aside>

          <main className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="mb-6 flex items-center gap-4 lg:hidden">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--secondary)] to-[var(--accent)]">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">Register your clinic</h1>
                <p className="text-sm text-[var(--text-secondary)]">Apply for platform access</p>
              </div>
            </div>
            <ClinicRegistrationForm />
          </main>
        </div>
      </div>
    </div>
  );
}
