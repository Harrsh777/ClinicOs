import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui/card";
import { ClinicSettingsForm } from "@/components/owner/clinic-settings-form";
import { QRCodeDisplay } from "@/components/owner/qr-code-display";

export default async function OwnerSettingsPage() {
  const profile = await requireRole(["clinic_owner"]);
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("*").eq("id", profile.clinic_id!).single();

  return (
    <div>
      <PageHeader title="Clinic Settings" subtitle="Configure your clinic profile and check-in" />
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
