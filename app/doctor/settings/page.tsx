import { requireAuth } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { ClinicSettingsForm } from "@/components/owner/clinic-settings-form";
import type { Clinic } from "@/lib/types/database";

export default async function DoctorSettingsPage() {
  const profile = await requireAuth();
  const service = await createServiceClient();

  const [{ data: clinic }, { data: branding }] = await Promise.all([
    service.from("clinics").select("*").eq("id", profile.clinic_id!).single(),
    service.from("clinic_branding").select("*").eq("clinic_id", profile.clinic_id!).maybeSingle(),
  ]);

  if (!clinic) {
    return (
      <div className="py-12 text-center text-sm text-[var(--text-muted)]">
        No active clinic assigned to your account.
      </div>
    );
  }

  const fullClinic = {
    ...(clinic as Clinic),
    branding: branding ?? undefined,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Doctor & Clinic Settings"
        subtitle="Manage consultation rates, toggle teleconsult / emergency modes, and customize your public booking page theme"
      />

      <ClinicSettingsForm clinic={fullClinic} />
    </div>
  );
}
