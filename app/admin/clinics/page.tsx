import Link from "next/link";
import { getClinicManagementRows, type ClinicManagementStatus } from "@/lib/actions/clinic-management";
import { getPlans } from "@/lib/actions/admin";
import { PageHeader } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { CreateClinicForm } from "@/components/admin/create-clinic-form";
import { ClinicRowActions } from "@/components/admin/clinic-row-actions";

const STATUS_TABS: { key: ClinicManagementStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
];

export default async function ClinicsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const status = params.status;
  const filter =
    status === "pending" ||
    status === "approved" ||
    status === "rejected" ||
    status === "suspended" ||
    status === "active" ||
    status === "trial"
      ? (status as ClinicManagementStatus)
      : "all";

  const [rows, plans] = await Promise.all([
    getClinicManagementRows(filter),
    getPlans(),
  ]);
  const defaultPlanId = plans.find((p) => p.slug === "pro")?.id ?? plans[0]?.id;

  return (
    <div>
      <PageHeader
        title="Clinics"
        subtitle="Manage clinic registrations, approvals, and tenant status"
        action={<CreateClinicForm plans={plans} />}
      />

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/admin/clinics" : `/admin/clinics?status=${tab.key}`}
            className={
              filter === tab.key
                ? "font-semibold text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }
          >
            {tab.label}
          </Link>
        ))}
        <Link href="/admin/applications" className="ml-auto text-[var(--text-muted)] hover:underline">
          Legacy applications view
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Clinic</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Clinic ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-[var(--text-muted)]">
                No clinics found
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={`${row.kind}-${row.id}`}>
                <TableCell>
                  {row.clinicId ? (
                    <Link href={`/admin/clinics/${row.clinicId}`} className="font-medium hover:text-[var(--brand-600)]">
                      {row.name}
                    </Link>
                  ) : (
                    <p className="font-medium">{row.name}</p>
                  )}
                  {row.doctorCount != null && (
                    <p className="text-xs text-[var(--text-muted)]">{row.doctorCount} doctors</p>
                  )}
                </TableCell>
                <TableCell>
                  <p>{row.ownerName ?? "—"}</p>
                  {row.ownerEmail && (
                    <p className="text-xs text-[var(--text-muted)]">{row.ownerEmail}</p>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {[row.city, row.state].filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell className="text-sm">{row.clinicType ?? "—"}</TableCell>
                <TableCell className="font-mono text-sm">{row.clinicCode ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                  {row.rejectionReason && row.status === "rejected" && (
                    <p className="mt-1 text-xs text-[var(--text-muted)] max-w-[160px] truncate" title={row.rejectionReason}>
                      {row.rejectionReason}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-sm text-[var(--text-muted)]">
                  {new Date(row.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <ClinicRowActions
                    applicationId={row.applicationId}
                    clinicId={row.clinicId}
                    status={row.status}
                    planId={defaultPlanId}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
