import { requireRole } from "@/lib/auth/session";
import { getInventoryItems } from "@/lib/actions/inventory";
import { PageHeader } from "@/components/ui/card";
import { InventoryManager } from "@/components/inventory/inventory-manager";

export default async function OwnerInventoryPage() {
  const profile = await requireRole(["clinic_owner"]);
  const items = await getInventoryItems(profile.clinic_id!);

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Clinic supplies and consumables" />
      <InventoryManager items={items} />
    </div>
  );
}
