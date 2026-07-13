import { requireRole } from "@/lib/auth/session";
import { getLinkedDoctor } from "@/lib/auth/linked-doctor";
import { PageHeader } from "@/components/ui/card";
import { AIDoctorChat } from "@/components/ai/ai-doctor-chat";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function OwnerAIDoctorPage() {
  const profile = await requireRole(["clinic_owner"]);
  const linkedDoctor = await getLinkedDoctor(profile.id);

  if (!linkedDoctor) {
    return (
      <div className="space-y-4">
        <PageHeader title="AI Doctor" subtitle="Clinical decision support for practicing physicians" />
        <div className="clinic-card p-6 space-y-3">
          <p className="text-[var(--text-secondary)]">
            AI Doctor is available when your owner account is linked to a doctor profile.
          </p>
          <Link href="/owner/settings">
            <Button variant="secondary" size="sm">Clinic Settings</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Doctor"
        subtitle="Ask clinical questions — differential diagnosis, guidelines, interactions, and more"
      />
      <AIDoctorChat />
    </div>
  );
}
