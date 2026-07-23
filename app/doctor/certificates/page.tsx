import Link from "next/link";
import { format } from "date-fns";
import { Plus, FileText, CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { getIssuedCertificates } from "@/lib/actions/medical-certificates";
import { PageHeader } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";

export default async function DoctorCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const status = params.status;
  const search = params.search;

  const certificates = await getIssuedCertificates({ status, search });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Certificates"
        subtitle="Issue, manage, and verify official medical certificates for patients"
        action={
          <div className="flex gap-3">
            <Link href="/doctor/certificates/templates" className="clinic-btn clinic-btn-secondary gap-2 text-xs">
              <FileText className="h-4 w-4" /> Template Library
            </Link>
            <Link href="/doctor/certificates/new" className="clinic-btn clinic-btn-primary gap-2 text-xs">
              <Plus className="h-4 w-4" /> Issue New Certificate
            </Link>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/doctor/certificates"
            className={`rounded-lg px-3 py-1.5 font-medium ${!status || status === "all" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"}`}
          >
            All Issued ({certificates.length})
          </Link>
          <Link
            href="/doctor/certificates?status=issued"
            className={`rounded-lg px-3 py-1.5 font-medium ${status === "issued" ? "bg-teal-600 text-white" : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"}`}
          >
            Valid / Issued
          </Link>
          <Link
            href="/doctor/certificates?status=revoked"
            className={`rounded-lg px-3 py-1.5 font-medium ${status === "revoked" ? "bg-red-600 text-white" : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"}`}
          >
            Revoked
          </Link>
        </div>

        {/* Search */}
        <form className="flex gap-2">
          <input
            type="text"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search code, patient, diagnosis..."
            className="clinic-input text-xs w-64"
          />
          <button type="submit" className="clinic-btn clinic-btn-secondary text-xs">Search</button>
        </form>
      </div>

      {/* Certificates List Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Certificate Code</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Diagnosis / Clinical Notes</TableHead>
            <TableHead>Rest Period</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {certificates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-[var(--text-muted)]">
                No medical certificates issued yet.
                <div className="mt-3">
                  <Link href="/doctor/certificates/new" className="clinic-btn clinic-btn-primary gap-2 text-xs">
                    <Plus className="h-4 w-4" /> Issue Your First Certificate
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            certificates.map((cert) => (
              <TableRow key={cert.id}>
                <TableCell>
                  <Link href={`/doctor/certificates/${cert.id}`} className="font-mono text-xs font-bold text-teal-700 hover:underline">
                    {cert.certificate_code}
                  </Link>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-xs text-[var(--text-primary)]">{cert.patients?.full_name ?? "—"}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{cert.patients?.phone ?? "No contact"}</p>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="text-xs font-medium text-[var(--text-secondary)] truncate" title={cert.diagnosis ?? ""}>
                    {cert.diagnosis ?? "—"}
                  </p>
                </TableCell>
                <TableCell className="text-xs">
                  {cert.rest_duration_days ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-amber-800 font-medium text-[11px] border border-amber-200">
                      <Clock className="h-3 w-3" /> {cert.rest_duration_days} Day(s)
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-xs text-[var(--text-muted)]">
                  {format(new Date(cert.issued_at), "dd MMM yyyy")}
                </TableCell>
                <TableCell>
                  {cert.status === "issued" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> Valid
                    </span>
                  )}
                  {cert.status === "revoked" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
                      <XCircle className="h-3 w-3" /> Revoked
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/doctor/certificates/${cert.id}`}
                    className="clinic-btn clinic-btn-secondary text-xs px-2.5 py-1"
                  >
                    View & Print
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
