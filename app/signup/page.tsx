import { Activity, CheckCircle2 } from "lucide-react";
import { getPublicPlans } from "@/lib/actions/signup";
import { ClinicApplicationForm } from "@/components/signup/clinic-application-form";

export default async function SignupPage() {
  const plans = await getPublicPlans();

  return (
    <div className="clinic-auth-bg flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,.5)]">
        <div className="grid lg:grid-cols-[minmax(0,260px)_1fr]">
          <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[var(--primary)] to-slate-800 px-7 py-9 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(20,184,166,.3),transparent_18rem)]" />
            <div className="relative">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/15 ring-1 ring-teal-300/30">
                  <Activity className="h-5 w-5 text-[var(--secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">ClinicOS</p>
                  <p className="text-xs text-slate-400">MedERP onboarding</p>
                </div>
              </div>
              <h1 className="text-2xl font-bold leading-snug tracking-tight">Register your clinic</h1>
              <p className="mt-2 text-sm text-slate-300">
                Apply to join MedERP. We&apos;ll review your application and send an activation link once approved.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" />
                  Takes about 5 minutes to complete
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" />
                  Email &amp; mobile verification required
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" />
                  Admin review within 1–2 business days
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
                <p className="text-sm text-[var(--text-secondary)]">Apply to join MedERP</p>
              </div>
            </div>
            <ClinicApplicationForm plans={plans} />
          </main>
        </div>
      </div>
    </div>
  );
}
