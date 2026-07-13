import Link from "next/link";
import { notFound } from "next/navigation";
import { getClinicPlatformDetail } from "@/lib/actions/platform-admin";
import { PageHeader, StatCard } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Users, UserCog, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClinicPlatformDetail(id);
  if (!data.clinic) notFound();

  const clinic = data.clinic;
  const plan = data.subscription?.plans as { name?: string; price_monthly?: number } | undefined;

  return (
    <div>
      <PageHeader
        title={clinic.name}
        subtitle={`Clinic ID: ${clinic.clinic_code} · ${clinic.city ?? "—"}`}
        action={
          <Link href="/admin/clinics">
            <Button variant="secondary" size="sm">← All clinics</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Patients" value={data.patientCount} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Staff" value={data.staffCount} icon={<UserCog className="h-5 w-5" />} />
        <StatCard label="Appointments (30d)" value={data.appointmentCount30d} icon={<Calendar className="h-5 w-5" />} />
        <StatCard
          label="Plan"
          value={plan?.name ?? "—"}
          icon={<Building2 className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="clinic-card p-5">
          <h3 className="font-semibold mb-3">Clinic details</h3>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Status</dt><dd><StatusBadge status={clinic.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Clinic ID</dt><dd className="font-mono">{clinic.clinic_code}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Email</dt><dd>{clinic.email ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Phone</dt><dd>{clinic.phone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--text-muted)]">Address</dt><dd className="text-right max-w-[60%]">{clinic.address ?? "—"}</dd></div>
          </dl>
        </div>

        <div className="clinic-card p-5 lg:col-span-2">
          <h3 className="font-semibold mb-3">Login credentials</h3>
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Staff sign in at <span className="font-mono">/login</span> with Clinic ID + Staff ID + password.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Name / Email</TableHead>
                <TableHead>Clinic ID</TableHead>
                <TableHead>Staff ID</TableHead>
                <TableHead>Password</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.credentials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[var(--text-muted)]">
                    No stored credentials — approve or create the clinic to capture owner login details.
                  </TableCell>
                </TableRow>
              ) : (
                data.credentials.map((cred) => (
                  <TableRow key={cred.id}>
                    <TableCell className="capitalize">{cred.role.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <p className="font-medium">{cred.email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{cred.clinic_code}</TableCell>
                    <TableCell className="font-mono text-sm">{cred.staff_code}</TableCell>
                    <TableCell className="font-mono text-sm">{cred.initial_password}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="clinic-card p-5">
          <h3 className="font-semibold mb-3">Staff accounts</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Staff ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{s.email}</p>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{s.staff_code ?? "—"}</TableCell>
                  <TableCell className="capitalize text-sm">{s.role.replace(/_/g, " ")}</TableCell>
                  <TableCell><StatusBadge status={s.is_active ? "active" : "suspended"} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="clinic-card p-5 lg:col-span-2">
          <h3 className="font-semibold mb-3">Recent patients</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[var(--text-muted)]">No patients yet</TableCell>
                </TableRow>
              ) : (
                data.patients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{p.patient_code ?? "—"}</TableCell>
                    <TableCell>{p.phone}</TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
