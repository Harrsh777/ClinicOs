import { requireRole } from "@/lib/auth/session";
import { getLinkedDoctor } from "@/lib/auth/linked-doctor";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { LiveQueueHub } from "@/components/queue/live-queue-hub";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function OwnerMyQueuePage() {
  const profile = await requireRole(["clinic_owner"]);
  const linkedDoctor = await getLinkedDoctor(profile.id);

  if (!linkedDoctor) {
    return (
      <div className="space-y-4">
        <PageHeader title="My Queue" subtitle="Doctor view of your patient queue" />
        <div className="clinic-card p-6 space-y-3">
          <p className="text-[var(--text-secondary)]">
            Your owner account is not linked to a doctor profile yet. Enable clinical access from{" "}
            <Link href="/owner/staff" className="font-medium text-[var(--brand-600)] hover:underline">
              Staff Management
            </Link>
            , or create a doctor staff account for someone else.
          </p>
          <Link href="/owner/staff">
            <Button variant="secondary" size="sm">Go to Staff Management</Button>
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("slug")
    .eq("id", profile.clinic_id!)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Queue"
        subtitle="Start consultations and manage your patient flow — same view doctors use"
      />
      <LiveQueueHub
        clinicId={profile.clinic_id!}
        clinicSlug={clinic?.slug}
        userRole={profile.role}
        doctorId={linkedDoctor.id}
        clinicalMode
      />
    </div>
  );
}
