import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/card";
import { ExecutiveDashboard } from "@/components/owner/executive-dashboard";
import { getExecutiveDashboard } from "@/lib/actions/executive-dashboard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, ListOrdered } from "lucide-react";

export default async function OwnerDashboard() {
  const profile = await requireRole(["clinic_owner"]);
  const data = await getExecutiveDashboard(profile.clinic_id!);

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        subtitle="The one screen clinic owners actually buy"
        action={
          <div className="flex gap-2">
            <Link href="/owner/franchise">
              <Button variant="secondary" size="sm" className="gap-2">
                <Building2 className="h-4 w-4" />
                Franchise
              </Button>
            </Link>
            <Link href="/owner/queue">
              <Button variant="secondary" size="sm" className="gap-2">
                <ListOrdered className="h-4 w-4" />
                Live Queue
              </Button>
            </Link>
          </div>
        }
      />
      <ExecutiveDashboard data={data} />
    </div>
  );
}
