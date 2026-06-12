import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPrescriptions } from "@/lib/actions/prescriptions";
import { PageHeader, Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PatientPrescriptionsPage() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("id").eq("user_id", profile.id).single();

  if (!patient) {
    return <div className="clinic-card p-6 text-center text-[var(--text-muted)]">Patient record not linked.</div>;
  }

  const prescriptions = await getPrescriptions(patient.id);

  return (
    <div>
      <PageHeader title="My Prescriptions" subtitle="Download your e-prescriptions" />
      <div className="space-y-4">
        {prescriptions.map((rx) => {
          const items = rx.prescription_items as { medicine_name: string; dosage: string; frequency: string; duration: string }[];
          return (
            <Card key={rx.id} padding className="!p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">{new Date(rx.created_at).toLocaleDateString()}</p>
                  <p className="font-medium mt-1">
                    Dr. {(rx.doctors as { profiles?: { full_name: string } })?.profiles?.full_name}
                  </p>
                </div>
                <Link href={`/print/prescription/${rx.id}`} target="_blank">
                  <Button size="sm">Download PDF</Button>
                </Link>
              </div>
              <div className="mt-4 space-y-1">
                {(items ?? []).map((item, i) => (
                  <p key={i} className="text-sm">
                    {item.medicine_name} {item.dosage} — {item.frequency} — {item.duration}
                  </p>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
