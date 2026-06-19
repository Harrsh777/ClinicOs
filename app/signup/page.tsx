import { Activity } from "lucide-react";
import { getPublicPlans } from "@/lib/actions/signup";
import { ClinicApplicationForm } from "@/components/signup/clinic-application-form";

export default async function SignupPage() {
  const plans = await getPublicPlans();

  return (
    <div className="clinic-auth-bg min-h-screen py-12 px-4">
      <div className="mx-auto max-w-xl">
        <div className="clinic-auth-card">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-500)]">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Register your clinic</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Apply to join ClinicOS. We&apos;ll review and send your login credentials by email.
            </p>
          </div>
          <ClinicApplicationForm plans={plans} />
        </div>
      </div>
    </div>
  );
}
