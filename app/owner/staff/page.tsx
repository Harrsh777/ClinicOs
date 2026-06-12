import { requireRole } from "@/lib/auth/session";
import { getClinicStaff } from "@/lib/actions/owner";
import { PageHeader } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { InviteStaffForm } from "@/components/owner/invite-staff-form";
import { DeactivateStaffButton } from "@/components/owner/deactivate-staff-button";

export default async function StaffPage() {
  const profile = await requireRole(["clinic_owner"]);
  const staff = await getClinicStaff(profile.clinic_id!);

  return (
    <div>
      <PageHeader title="Staff Management" subtitle="Invite and manage your clinic team" />
      <InviteStaffForm />
      <div className="mt-6">
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
      </div>
    </div>
  );
}
