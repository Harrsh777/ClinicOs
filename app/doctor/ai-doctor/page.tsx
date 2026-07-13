import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/card";
import { AIDoctorChat } from "@/components/ai/ai-doctor-chat";

export default async function DoctorAIDoctorPage() {
  await requireRole(["doctor"]);

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
