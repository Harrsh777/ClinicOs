import Link from "next/link";
import { getClinicApplications } from "@/lib/actions/platform-applications";
import { getPlans } from "@/lib/actions/admin";
import { PageHeader } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ApplicationActions } from "@/components/admin/application-actions";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const status = params.status;
  const filter =
    status === "approved" || status === "rejected" || status === "pending" ? status : undefined;
  const [applications, plans] = await Promise.all([
    getClinicApplications(filter),
    getPlans(),
  ]);
  const defaultPlanId = plans.find((p) => p.slug === "pro")?.id ?? plans[0]?.id;

  return (
    <div>
      <PageHeader
        title="Clinic Applications"
        subtitle="Review signup requests from new clinics"
        action={
          <div className="flex gap-2 text-sm">
            <Link href="/admin/applications" className={!filter ? "font-semibold" : "text-[var(--text-muted)]"}>
              All
            </Link>
            <Link href="/admin/applications?status=pending" className={filter === "pending" ? "font-semibold" : "text-[var(--text-muted)]"}>
              Pending
            </Link>
            <Link href="/admin/applications?status=approved" className={filter === "approved" ? "font-semibold" : "text-[var(--text-muted)]"}>
              Approved
            </Link>
          </div>
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Clinic</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-[var(--text-muted)] py-8">
                No applications found
              </TableCell>
            </TableRow>
          ) : (
            applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <p className="font-medium">{app.clinic_name}</p>
                  {app.clinics && (
                    <p className="text-xs text-[var(--text-muted)]">
                      ID: {(app.clinics as { clinic_code?: string }).clinic_code}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <p>{app.owner_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{app.owner_email}</p>
                </TableCell>
                <TableCell className="text-sm">
                  {[app.city, app.state].filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell className="capitalize">{app.plan_slug}</TableCell>
                <TableCell><StatusBadge status={app.status} /></TableCell>
                <TableCell className="text-sm text-[var(--text-muted)]">
                  {new Date(app.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {app.status === "pending" ? (
                    <ApplicationActions applicationId={app.id} planId={defaultPlanId} />
                  ) : app.clinic_id ? (
                    <Link href={`/admin/clinics/${app.clinic_id}`} className="text-sm text-[var(--brand-600)] hover:underline">
                      View clinic
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
