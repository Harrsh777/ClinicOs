import { requireRole } from "@/lib/auth/session";
import { getPlatformAnalytics } from "@/lib/actions/platform-admin";
import { PageHeader } from "@/components/ui/card";
import { PlatformAnalytics } from "@/components/admin/platform-analytics";

export default async function AdminAnalyticsPage() {
  await requireRole(["super_admin"]);
  const analytics = await getPlatformAnalytics();

  return (
    <div>
      <PageHeader title="Platform Analytics" subtitle="MRR, clinic growth, and AI usage across all tenants" />
      <PlatformAnalytics analytics={analytics} />
    </div>
  );
}
