import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getClinicStaff, getPendingInvites, getClinicDepartments } from "@/lib/actions/owner";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { CreateStaffForm } from "@/components/owner/create-staff-form";
import { InviteStaffForm } from "@/components/owner/invite-staff-form";
import { DeactivateStaffButton } from "@/components/owner/deactivate-staff-button";
import { PendingInviteActions } from "@/components/owner/pending-invite-actions";
import { Users } from "lucide-react";

export default async function AdministratorStaffPage() {
  const profile = await requireRole(["administrator"]);
  const supabase = await createClient();
  const [{ data: clinic }, staff, pendingInvites, departments] = await Promise.all([
    supabase.from("clinics").select("clinic_code, name").eq("id", profile.clinic_id!).single(),
    getClinicStaff(profile.clinic_id!),
    getPendingInvites(profile.clinic_id!),
    getClinicDepartments(profile.clinic_id!),
  ]);

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle={`Manage team for ${clinic?.name ?? "your clinic"} — Clinic ID: ${clinic?.clinic_code ?? "—"}`}
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <CreateStaffForm clinicCode={clinic?.clinic_code ?? ""} departments={departments} />
        <InviteStaffForm />
      </div>
      {pendingInvites.length > 0 && (
        <div className="clinic-card mb-6 p-5">
          <h3 className="mb-3 font-semibold">Pending invite links</h3>
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
                <TableHead>Staff ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.full_name}</TableCell>
                  <TableCell className="font-mono text-sm">{member.staff_code ?? "—"}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell className="capitalize">{member.role.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <StatusBadge status={member.is_active === false ? "inactive" : "active"} />
                  </TableCell>
                  <TableCell>
                    {member.role !== "clinic_owner" && member.role !== "administrator" && (
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
