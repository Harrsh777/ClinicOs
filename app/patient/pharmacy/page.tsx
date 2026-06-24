import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPatientPharmacyOrders } from "@/lib/actions/patient-portal";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { Pill } from "lucide-react";

export default async function PatientPharmacyPage() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("id").eq("user_id", profile.id).maybeSingle();

  if (!patient) {
    return <div className="clinic-card p-6 text-center text-[var(--text-muted)]">Patient record not linked.</div>;
  }

  const orders = await getPatientPharmacyOrders(patient.id);

  return (
    <div>
      <PageHeader title="Pharmacy" subtitle="Medicines dispensed at your clinic pharmacy" />

      {orders.length === 0 ? (
        <EmptyState icon={<Pill />} title="No pharmacy records" description="Dispensed medicines will appear here after your visit." />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const med = order.pharmacy_medicines as unknown as {
              name: string;
              generic_name: string | null;
              unit: string | null;
            } | null;
            return (
              <Card key={order.id} padding className="!p-5">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{med?.name ?? "Medicine"}</p>
                    {med?.generic_name && (
                      <p className="text-sm text-[var(--text-muted)]">{med.generic_name}</p>
                    )}
                    {med?.unit && (
                      <p className="text-xs text-[var(--text-muted)]">{med.unit}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Qty: {order.quantity}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {new Date(order.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
