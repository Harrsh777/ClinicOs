import Link from "next/link";
import { getExpiryAlerts } from "@/lib/actions/pharmacy";
import { getLowStockAlerts } from "@/lib/actions/inventory";
import { getExpiringPolicies } from "@/lib/actions/insurance";
import { getPendingLabOrderCount } from "@/lib/actions/inventory";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

const ALERT_LINKS: Record<string, string> = {
  Lab: "/owner/lab?tab=orders",
  Pharmacy: "/owner/pharmacy",
  Insurance: "/owner/insurance",
};

export async function OwnerAlerts({ clinicId }: { clinicId: string }) {
  const [expiry, alerts, policies, pendingLabs] = await Promise.all([
    getExpiryAlerts(clinicId),
    getLowStockAlerts(clinicId),
    getExpiringPolicies(clinicId),
    getPendingLabOrderCount(clinicId),
  ]);

  const items = [
    ...expiry.map((e) => ({
      type: "Pharmacy Expiry",
      message: `${(e.pharmacy_medicines as { name: string })?.name} batch ${e.batch_number} expires ${new Date(e.expiry_date).toLocaleDateString()}`,
      href: ALERT_LINKS.Pharmacy,
    })),
    ...alerts.map((a) => ({
      type: a.alert_type.replace(/_/g, " "),
      message: a.message,
      href: a.alert_type.includes("lab") ? ALERT_LINKS.Lab : ALERT_LINKS.Pharmacy,
    })),
    ...policies.map((p) => ({
      type: "Insurance",
      message: `${(p.patients as { full_name: string })?.full_name}'s ${p.company} policy expires ${new Date(p.expiry_date).toLocaleDateString()}`,
      href: ALERT_LINKS.Insurance,
    })),
    ...(pendingLabs > 0
      ? [{ type: "Lab", message: `${pendingLabs} lab order(s) pending upload`, href: ALERT_LINKS.Lab }]
      : []),
  ];

  return (
    <Card>
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[var(--warning-500)]" />
        Operations Alerts
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">All clear — no alerts</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="flex items-start gap-3 text-sm py-2 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] -mx-2 px-2 rounded transition-colors"
            >
              <Badge variant="warning" className="capitalize shrink-0">{item.type}</Badge>
              <span>{item.message}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
