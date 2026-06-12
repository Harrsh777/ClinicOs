import { requireRole } from "@/lib/auth/session";
import { getLabTests } from "@/lib/actions/lab";
import { PageHeader, Card } from "@/components/ui/card";
import { LabCatalogForm } from "@/components/lab/lab-catalog-form";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SeedLabTestsButton } from "@/components/lab/seed-lab-tests-button";

export default async function OwnerLabPage() {
  const profile = await requireRole(["clinic_owner"]);
  let tests = await getLabTests(profile.clinic_id!);

  return (
    <div>
      <PageHeader
        title="Lab Test Catalog"
        subtitle="Manage available lab tests and pricing"
        action={<SeedLabTestsButton clinicId={profile.clinic_id!} />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <LabCatalogForm />
        <Card>
          <h3 className="font-semibold mb-4">Tests ({tests.length})</h3>
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
        </Card>
      </div>
    </div>
  );
}
