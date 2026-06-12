import { requireRole } from "@/lib/auth/session";
import { getClinicBranding } from "@/lib/actions/platform-admin";
import { PageHeader } from "@/components/ui/card";
import { BrandingForm } from "@/components/owner/branding-form";

export default async function OwnerBrandingPage() {
  const profile = await requireRole(["clinic_owner"]);
  const branding = await getClinicBranding(profile.clinic_id!);

  return (
    <div>
      <PageHeader
        title="Clinic Branding"
        subtitle="White-label settings, colors, and WhatsApp integration"
      />
      <BrandingForm clinicId={profile.clinic_id!} branding={branding} />
    </div>
  );
}
