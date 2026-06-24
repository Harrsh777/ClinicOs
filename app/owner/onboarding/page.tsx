import { redirect } from "next/navigation";
import { Activity, CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getOnboardingState } from "@/lib/actions/onboarding";
import { OnboardingWizard } from "@/components/owner/onboarding-wizard";

export default async function OwnerOnboardingPage() {
  const profile = await requireRole(["clinic_owner"]);
  const state = await getOnboardingState();

  if (!state?.clinic) redirect("/owner");

  if (state.clinic.clinic_setup_completed && !profile.first_login) {
    redirect("/owner");
  }

  const clinicName = state.clinic.name;

  return (
    <div className="clinic-auth-bg flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,.5)]">
        <div className="grid lg:grid-cols-[minmax(0,280px)_1fr]">
          <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[var(--primary)] to-slate-800 px-7 py-9 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(20,184,166,.3),transparent_18rem)]" />
            <div className="relative">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/15 ring-1 ring-teal-300/30">
                  <Activity className="h-5 w-5 text-[var(--secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">ClinicOS</p>
                  <p className="text-xs text-slate-400">Clinic setup</p>
                </div>
              </div>
              <h1 className="text-2xl font-bold leading-snug tracking-tight">
                Set up {clinicName}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Configure your clinic profile, departments, and services so your team can start using MedERP right away.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" />
                  Four quick steps — about 3 minutes
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" />
                  You can update these settings later
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--secondary)]" />
                  Unlocks your full owner dashboard
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
                <h1 className="text-xl font-bold text-[var(--text-primary)]">Set up {clinicName}</h1>
                <p className="text-sm text-[var(--text-secondary)]">Complete your clinic profile</p>
              </div>
            </div>
            <OnboardingWizard
              clinic={state.clinic}
              departments={state.departments}
              plans={state.plans}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
