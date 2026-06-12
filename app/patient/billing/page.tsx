import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPatientBills } from "@/lib/actions/billing";
import { PageHeader } from "@/components/ui/card";
import { PatientBillsList } from "@/components/billing/patient-bills-list";

export default async function PatientBillingPage() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("id").eq("user_id", profile.id).single();

  if (!patient) {
    return <div className="clinic-card p-6 text-center text-[var(--text-muted)]">Patient record not linked.</div>;
  }

  const bills = await getPatientBills(patient.id);

  return (
    <div>
      <PageHeader title="My Bills" subtitle="View and pay outstanding invoices" />
      <PatientBillsList bills={bills} />
    </div>
  );
}
