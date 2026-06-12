import { getPlans } from "@/lib/actions/admin";
import { PageHeader } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <div>
      <PageHeader title="Subscription Plans" subtitle="Platform pricing tiers" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Price / month</TableHead>
            <TableHead>Features</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell className="font-medium">{plan.name}</TableCell>
              <TableCell>₹{plan.price_monthly}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(plan.features as Record<string, boolean>)
                    .filter(([, v]) => v)
                    .map(([k]) => (
                      <Badge key={k} variant="brand">{k}</Badge>
                    ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
