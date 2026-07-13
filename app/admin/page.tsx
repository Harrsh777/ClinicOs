import Link from "next/link";
import { PageHeader, StatCard } from "@/components/ui/card";
import { Building2, Users, Inbox, Calendar, BarChart3, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { getClinics } from "@/lib/actions/admin";
import { getPlatformAnalytics, getPlatformOverview, getPlatformCredentials } from "@/lib/actions/platform-admin";
import { getDemoRequestStats } from "@/lib/actions/demo-requests";
import { Button } from "@/components/ui/button";
import { PlatformAnalytics } from "@/components/admin/platform-analytics";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  const [clinics, analytics, overview, demoStats, credentials] = await Promise.all([
    getClinics(),
    getPlatformAnalytics(),
    getPlatformOverview(),
    getDemoRequestStats(),
    getPlatformCredentials(),
  ]);
  const active = clinics.filter((c) => c.status === "active").length;
  const trial = clinics.filter((c) => c.status === "trial").length;

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        subtitle="Full visibility across all clinics, patients, and operations"
        action={
          <div className="flex flex-wrap gap-2">
            {demoStats.newCount > 0 && (
              <Link href="/admin/demo-requests?status=new">
                <Button size="sm" variant="secondary" className="gap-2">
                  <CalendarClock className="h-4 w-4" />
                  {demoStats.newCount} demo leads
                </Button>
              </Link>
            )}
            {overview.pendingApplications > 0 && (
              <Link href="/admin/applications?status=pending">
                <Button size="sm" className="gap-2">
                  <Inbox className="h-4 w-4" />
                  {overview.pendingApplications} pending
                </Button>
              </Link>
            )}
            <Link href="/admin/analytics">
              <Button variant="secondary" size="sm" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href="/admin/demo-requests">
              <Button variant="secondary" size="sm">Demo Requests</Button>
            </Link>
            <Link href="/admin/applications">
              <Button variant="secondary" size="sm">Applications</Button>
            </Link>
            <Link href="/admin/clinics">
              <Button size="sm">Manage Clinics</Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <StatCard label="Total Clinics" value={overview.clinicCount} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Active" value={active} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="On Trial" value={trial} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Platform Patients" value={overview.patientCount} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Appointments (30d)" value={overview.appointmentCount30d} icon={<Calendar className="h-5 w-5" />} />
      </div>

      <div className="mb-8 clinic-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Clinic login credentials</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Owner accounts created or approved from this admin panel. Passwords are stored for platform support only.
            </p>
          </div>
          <Link href="/admin/clinics" className="text-sm text-[var(--brand-600)] hover:underline">
            All clinics
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clinic</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Clinic ID</TableHead>
              <TableHead>Staff ID</TableHead>
              <TableHead>Password</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credentials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[var(--text-muted)]">
                  No credentials stored yet
                </TableCell>
              </TableRow>
            ) : (
              credentials.slice(0, 12).map((cred) => {
                const clinicMeta = cred.clinics as { name?: string; status?: string; city?: string } | null;
                return (
                  <TableRow key={cred.id}>
                    <TableCell>
                      <Link
                        href={`/admin/clinics/${cred.clinic_id}`}
                        className="font-medium hover:text-[var(--brand-600)]"
                      >
                        {clinicMeta?.name ?? "—"}
                      </Link>
                      {clinicMeta?.city && (
                        <p className="text-xs text-[var(--text-muted)]">{clinicMeta.city}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{cred.email}</TableCell>
                    <TableCell className="font-mono text-sm">{cred.clinic_code}</TableCell>
                    <TableCell className="font-mono text-sm">{cred.staff_code}</TableCell>
                    <TableCell className="font-mono text-sm">{cred.initial_password}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="clinic-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent demo requests</h3>
            <Link href="/admin/demo-requests" className="text-sm text-[var(--brand-600)] hover:underline">View all</Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clinic</TableHead>
                <TableHead>Demo slot</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demoStats.recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-[var(--text-muted)]">No demo requests yet</TableCell>
                </TableRow>
              ) : (
                demoStats.recent.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <p className="font-medium">{d.clinic_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{d.email}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(d.preferred_date), "dd MMM yyyy")} · {d.preferred_time}
                    </TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="clinic-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent clinics</h3>
            <Link href="/admin/clinics" className="text-sm text-[var(--brand-600)] hover:underline">View all</Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clinic</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.recentClinics.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/admin/clinics/${c.id}`} className="font-medium hover:text-[var(--brand-600)]">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.clinic_code}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="clinic-card p-5">
          <h3 className="font-semibold mb-4">Recent patients (platform-wide)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Clinic</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.recentPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-[var(--text-muted)]">No patients yet</TableCell>
                </TableRow>
              ) : (
                overview.recentPatients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)]">
                      {(p.clinics as { name?: string } | null)?.name ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Revenue &amp; AI analytics</h3>
        <p className="text-sm text-[var(--text-muted)]">MRR: ₹{analytics.mrr.toLocaleString("en-IN")}</p>
      </div>
      <PlatformAnalytics analytics={analytics} />
    </div>
  );
}
