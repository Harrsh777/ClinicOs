import { requireRole } from "@/lib/auth/session";
import { getMedicines } from "@/lib/actions/pharmacy";
import { PageHeader } from "@/components/ui/card";
import { PharmacyManager } from "@/components/pharmacy/pharmacy-manager";

export default async function OwnerPharmacyPage() {
  const profile = await requireRole(["clinic_owner"]);
  const medicines = await getMedicines(profile.clinic_id!);

  return (
    <div>
      <PageHeader title="Pharmacy" subtitle="Medicine catalog, stock, and dispensing" />
      <PharmacyManager medicines={medicines} />
    </div>
  );
}
