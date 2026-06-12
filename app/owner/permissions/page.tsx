import { requireRole } from "@/lib/auth/session";
import { getClinicStaff } from "@/lib/actions/owner";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { PermissionsEditor } from "@/components/owner/permissions-editor";

export default async function PermissionsPage() {
  const profile = await requireRole(["clinic_owner"]);
  const [staff, modules] = await Promise.all([
    getClinicStaff(profile.clinic_id!),
    createClient().then((s) => s.from("system_modules").select("*").in("key", ["patients", "appointments", "queue", "finance", "settings"]).order("sort_order")),
  ]);

  const assignableStaff = staff.filter((s) => s.role !== "clinic_owner");

  return (
    <div>
      <PageHeader
        title="Module Permissions"
        subtitle="Control which modules each staff member can access"
      />
      <PermissionsEditor
        staff={assignableStaff}
        modules={(modules.data ?? []).map((m) => ({ key: m.key, name: m.name }))}
      />
    </div>
  );
}
