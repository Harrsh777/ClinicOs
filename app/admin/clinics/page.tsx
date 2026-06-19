import Link from "next/link";
import { getClinics, getPlans } from "@/lib/actions/admin";
import { PageHeader } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateClinicForm } from "@/components/admin/create-clinic-form";
import { SuspendClinicButton } from "@/components/admin/suspend-clinic-button";

export default async function ClinicsPage() {
  const [clinics, plans] = await Promise.all([getClinics(), getPlans()]);

  return (
    <div>
      <PageHeader
        title="Clinics"
        subtitle="Manage all clinic tenants on the platform"
        action={<CreateClinicForm plans={plans} />}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Clinic</TableHead>
            <TableHead>Clinic ID</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clinics.map((clinic) => {
            const sub = Array.isArray(clinic.subscriptions) ? clinic.subscriptions[0] : clinic.subscriptions;
            const plan = sub?.plans as { name: string } | undefined;
            return (
              <TableRow key={clinic.id}>
                <TableCell>
                  <Link href={`/admin/clinics/${clinic.id}`} className="hover:text-[var(--brand-600)]">
                    <p className="font-medium">{clinic.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{clinic.slug}</p>
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-sm">{clinic.clinic_code ?? "—"}</TableCell>
                <TableCell>{plan?.name ?? "—"}</TableCell>
                <TableCell><StatusBadge status={clinic.status} /></TableCell>
                <TableCell className="text-sm text-[var(--text-muted)]">
                  {new Date(clinic.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <SuspendClinicButton clinicId={clinic.id} suspended={clinic.status === "suspended"} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
