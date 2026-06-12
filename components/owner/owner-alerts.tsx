import { getExpiryAlerts } from "@/lib/actions/pharmacy";
import { getLowStockAlerts } from "@/lib/actions/inventory";
import { getExpiringPolicies } from "@/lib/actions/insurance";
import { getPendingLabOrderCount } from "@/lib/actions/inventory";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

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
    })),
    ...alerts.map((a) => ({ type: a.alert_type.replace(/_/g, " "), message: a.message })),
    ...policies.map((p) => ({
      type: "Insurance",
      message: `${(p.patients as { full_name: string })?.full_name}'s ${p.company} policy expires ${new Date(p.expiry_date).toLocaleDateString()}`,
    })),
    ...(pendingLabs > 0
      ? [{ type: "Lab", message: `${pendingLabs} lab order(s) pending upload` }]
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
            <div key={i} className="flex items-start gap-3 text-sm py-2 border-b border-[var(--border)] last:border-0">
              <Badge variant="warning" className="capitalize shrink-0">{item.type}</Badge>
              <span>{item.message}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
