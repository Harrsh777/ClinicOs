import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getLabTests, getLabOrders } from "@/lib/actions/lab";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { LabCatalogForm } from "@/components/lab/lab-catalog-form";
import { LabOrdersList } from "@/components/lab/lab-orders-list";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SeedLabTestsButton } from "@/components/lab/seed-lab-tests-button";
import { FlaskConical } from "lucide-react";

export default async function OwnerLabPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireRole(["clinic_owner"]);
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "orders" ? "orders" : "catalog";

  const [tests, orders] = await Promise.all([
    getLabTests(profile.clinic_id!),
    getLabOrders(profile.clinic_id!, tab === "orders" ? "ordered" : undefined),
  ]);

  const pendingOrders = tab === "orders" ? orders : await getLabOrders(profile.clinic_id!, "ordered");

  return (
    <div>
      <PageHeader
        title="Lab Management"
        subtitle="Test catalog and order tracking"
        action={<SeedLabTestsButton clinicId={profile.clinic_id!} />}
      />

      <div className="clinic-tabs mb-6">
        <Link href="/owner/lab" className={`clinic-tab ${tab === "catalog" ? "active" : ""}`}>
          Test Catalog
        </Link>
        <Link href="/owner/lab?tab=orders" className={`clinic-tab ${tab === "orders" ? "active" : ""}`}>
          Orders {pendingOrders.length > 0 && `(${pendingOrders.length} pending)`}
        </Link>
      </div>

      {tab === "catalog" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <LabCatalogForm />
          <Card>
            <h3 className="font-semibold mb-4">Tests ({tests.length})</h3>
            {tests.length === 0 ? (
              <EmptyState icon={<FlaskConical />} title="No tests in catalog" description="Add tests or seed defaults" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell className="font-mono text-sm">{t.code}</TableCell>
                      <TableCell>₹{t.price}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      ) : (
        <LabOrdersList orders={orders} uploadHref="/receptionist/lab" />
      )}
    </div>
  );
}
