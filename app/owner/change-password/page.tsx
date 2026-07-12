import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { ChangePasswordForm } from "@/components/owner/change-password-form";

export default async function ChangePasswordPage() {
  const profile = await requireRole(["clinic_owner"]);

  if (!profile.first_login) {
    redirect("/owner/onboarding");
  }

  return (
    <div className="clinic-auth-bg flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white p-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,.5)]">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--secondary)] to-[var(--accent)]">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Set your password</h1>
            <p className="text-sm text-[var(--text-secondary)]">First-time login security step</p>
          </div>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
