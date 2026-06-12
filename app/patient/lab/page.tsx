import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPatientLabReports } from "@/lib/actions/lab";
import { PageHeader, Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/card";
import { FlaskConical } from "lucide-react";

export default async function PatientLabPage() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("id").eq("user_id", profile.id).single();

  if (!patient) {
    return <div className="clinic-card p-6 text-center text-[var(--text-muted)]">Patient record not linked.</div>;
  }

  const reports = await getPatientLabReports(patient.id);

  return (
    <div>
      <PageHeader title="Lab Reports" subtitle="View your test results and AI explanations" />
      {!reports.length ? (
        <EmptyState icon={<FlaskConical />} title="No lab reports yet" />
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const order = report.lab_orders as { lab_order_items?: { lab_tests?: { name: string } }[] };
            const testNames = order?.lab_order_items?.map((i) => i.lab_tests?.name).filter(Boolean).join(", ");
            return (
              <Card key={report.id} padding className="!p-5">
                <p className="font-medium">{testNames || "Lab Report"}</p>
                <p className="text-sm text-[var(--text-muted)]">{new Date(report.uploaded_at).toLocaleDateString()}</p>
                {report.ai_summary && (
                  <Alert variant="info" className="mt-4">
                    <strong>What this means:</strong> {report.ai_summary}
                  </Alert>
                )}
                {report.result_values && (
                  <div className="mt-3 text-sm">
                    {Object.entries(report.result_values as Record<string, unknown>).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1 border-b border-[var(--border)]">
                        <span className="capitalize">{k}</span>
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
