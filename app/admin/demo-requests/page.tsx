import Link from "next/link";
import { format } from "date-fns";
import { getDemoRequests } from "@/lib/actions/demo-requests";
import { PageHeader } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { DemoRequestActions } from "@/components/admin/demo-request-actions";

export default async function DemoRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const status = params.status;
  const filter =
    status === "new" || status === "contacted" || status === "scheduled" || status === "closed" || status === "cancelled"
      ? status
      : undefined;
  const requests = await getDemoRequests(filter);

  return (
    <div>
      <PageHeader
        title="Demo Requests"
        subtitle="Book-a-demo leads from the public landing page"
        action={
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/admin/demo-requests" className={!filter ? "font-semibold" : "text-[var(--text-muted)]"}>
              All
            </Link>
            <Link href="/admin/demo-requests?status=new" className={filter === "new" ? "font-semibold" : "text-[var(--text-muted)]"}>
              New
            </Link>
            <Link href="/admin/demo-requests?status=contacted" className={filter === "contacted" ? "font-semibold" : "text-[var(--text-muted)]"}>
              Contacted
            </Link>
            <Link href="/admin/demo-requests?status=scheduled" className={filter === "scheduled" ? "font-semibold" : "text-[var(--text-muted)]"}>
              Scheduled
            </Link>
          </div>
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Clinic</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Demo slot</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Tracking</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-[var(--text-muted)]">
                No demo requests yet
              </TableCell>
            </TableRow>
          ) : (
            requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  <p className="font-medium">{req.clinic_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">Dr. {req.doctor_name}</p>
                  {req.clinic_type && <p className="text-xs text-[var(--text-muted)]">{req.clinic_type}</p>}
                </TableCell>
                <TableCell>
                  <p>{req.contact_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{req.email}</p>
                  <p className="text-xs text-[var(--text-muted)]">{req.phone}</p>
                </TableCell>
                <TableCell className="text-sm">
                  <p>{format(new Date(req.preferred_date), "dd MMM yyyy")}</p>
                  <p className="text-xs text-[var(--text-muted)]">{req.preferred_time}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Submitted {format(new Date(req.created_at), "dd MMM yyyy, HH:mm")}
                  </p>
                </TableCell>
                <TableCell className="text-sm">
                  {req.address && <p className="max-w-[180px] truncate" title={req.address}>{req.address}</p>}
                  <p className="text-xs text-[var(--text-muted)]">
                    {[req.city, req.state, req.pincode].filter(Boolean).join(", ") || "—"}
                  </p>
                </TableCell>
                <TableCell className="text-xs text-[var(--text-muted)] max-w-[200px]">
                  <p>IP: {req.ip_address ?? "—"}</p>
                  <p className="truncate" title={req.user_agent ?? undefined}>
                    UA: {req.user_agent ? req.user_agent.slice(0, 48) + (req.user_agent.length > 48 ? "…" : "") : "—"}
                  </p>
                  {req.referer && <p className="truncate" title={req.referer}>Ref: {req.referer}</p>}
                  {req.accept_language && <p>Lang: {req.accept_language}</p>}
                  {req.client_metadata?.timezone && <p>TZ: {String(req.client_metadata.timezone)}</p>}
                </TableCell>
                <TableCell>
                  <StatusBadge status={req.status} />
                  {req.notes && (
                    <p className="mt-1 text-xs text-[var(--text-muted)] max-w-[160px]" title={req.notes}>
                      {req.notes.slice(0, 60)}{req.notes.length > 60 ? "…" : ""}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <DemoRequestActions request={req} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
