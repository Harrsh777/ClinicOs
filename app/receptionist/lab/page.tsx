import { requireRole } from "@/lib/auth/session";
import { getLabOrders } from "@/lib/actions/lab";
import { PageHeader } from "@/components/ui/card";
import { LabOrdersList } from "@/components/lab/lab-orders-list";

export default async function ReceptionistLabPage() {
  const profile = await requireRole(["receptionist"]);
  const orders = await getLabOrders(profile.clinic_id!);

  return (
    <div>
      <PageHeader title="Lab Orders" subtitle="Upload reports and track orders" />
      <LabOrdersList orders={orders} />
    </div>
  );
}
