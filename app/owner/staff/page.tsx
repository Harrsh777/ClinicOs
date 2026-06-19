import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getClinicStaff, getPendingInvites } from "@/lib/actions/owner";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { CreateStaffForm } from "@/components/owner/create-staff-form";
import { InviteStaffForm } from "@/components/owner/invite-staff-form";
import { DeactivateStaffButton } from "@/components/owner/deactivate-staff-button";
import { PendingInviteActions } from "@/components/owner/pending-invite-actions";
import { Users } from "lucide-react";

export default async function StaffPage() {
  const profile = await requireRole(["clinic_owner"]);
  const supabase = await createClient();
  const [{ data: clinic }, staff, pendingInvites] = await Promise.all([
    supabase.from("clinics").select("clinic_code").eq("id", profile.clinic_id!).single(),
    getClinicStaff(profile.clinic_id!),
    getPendingInvites(profile.clinic_id!),
  ]);

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle={`Create accounts for doctors & receptionists — Clinic ID: ${clinic?.clinic_code ?? "—"}`}
      />
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <CreateStaffForm clinicCode={clinic?.clinic_code ?? ""} />
        <InviteStaffForm />
      </div>
      {pendingInvites.length > 0 && (
        <div className="clinic-card p-5 mb-6">
          <h3 className="font-semibold mb-3">Pending invite links</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.email}</TableCell>
                  <TableCell className="capitalize">{inv.role.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)]">
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <PendingInviteActions inviteId={inv.id} token={inv.token} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="mt-6">
        {staff.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No staff yet"
            description="Create an account or send an invite using the forms above"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell className="text-[var(--text-muted)]">{member.email}</TableCell>
                  <TableCell className="capitalize">{member.role.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <StatusBadge status={member.is_active ? "active" : "suspended"} />
                  </TableCell>
                  <TableCell>
                    {member.is_active && (
                      <DeactivateStaffButton staffId={member.id} name={member.full_name} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
