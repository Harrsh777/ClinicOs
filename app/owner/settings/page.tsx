import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getClinicFeatures } from "@/lib/clinic/features";
import { PageHeader, Card } from "@/components/ui/card";
import { ClinicSettingsForm } from "@/components/owner/clinic-settings-form";
import { QRCodeDisplay } from "@/components/owner/qr-code-display";
import { PublicBookingLinkCard } from "@/components/owner/public-booking-link-card";
import { FeatureUpgradeBanner } from "@/components/owner/feature-upgrade-banner";
import type { ClinicFeatureKey } from "@/lib/clinic/features";

interface OwnerSettingsPageProps {
  searchParams: Promise<{ upgrade?: string }>;
}

export default async function OwnerSettingsPage({ searchParams }: OwnerSettingsPageProps) {
  const profile = await requireRole(["clinic_owner"]);
  const supabase = await createClient();
  const { upgrade } = await searchParams;
  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", profile.clinic_id!)
    .single();

  const { planSlug } = await getClinicFeatures(profile.clinic_id);
  const upgradeFeature = upgrade as ClinicFeatureKey | undefined;

  return (
    <div>
      <PageHeader title="Clinic Settings" subtitle="Configure your clinic profile and check-in" />
      {upgradeFeature && (
        <FeatureUpgradeBanner feature={upgradeFeature} currentPlan={planSlug} />
      )}
      {clinic && (
        <div className="mb-6">
          <PublicBookingLinkCard
            clinicSlug={clinic.slug}
            clinicName={clinic.name}
            portalEnabled={clinic.portal_enabled ?? false}
          />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold mb-4">General Settings</h3>
          {clinic && <ClinicSettingsForm clinic={clinic} />}
        </Card>
        <Card>
          <h3 className="font-semibold mb-4">QR Check-in</h3>
          {clinic && <QRCodeDisplay clinicSlug={clinic.slug} clinicName={clinic.name} />}
        </Card>
      </div>
    </div>
  );
}
