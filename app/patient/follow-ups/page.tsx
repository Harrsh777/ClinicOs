import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPatientFollowUps } from "@/lib/actions/patient-portal";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { FollowUpResponseForm } from "@/components/patient/follow-up-response-form";
import { CalendarClock } from "lucide-react";

export default async function PatientFollowUpsPage() {
  const profile = await requireRole(["patient"]);
  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("id").eq("user_id", profile.id).maybeSingle();

  if (!patient) {
    return <div className="clinic-card p-6 text-center text-[var(--text-muted)]">Patient record not linked.</div>;
  }

  const tasks = await getPatientFollowUps(patient.id);
  const upcoming = tasks.filter((t) => t.status !== "completed" && t.status !== "responded");
  const past = tasks.filter((t) => t.status === "completed" || t.status === "responded");

  return (
    <div>
      <PageHeader title="Follow-ups" subtitle="Medication reminders and check-in questions from your doctor" />

      {tasks.length === 0 ? (
        <EmptyState icon={<CalendarClock />} title="No follow-ups" description="Your doctor will schedule follow-ups after consultations." />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold text-[var(--text-primary)]">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((task) => (
                  <Card key={task.id} padding className="!p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-medium">{task.medicine_name ?? "Follow-up check-in"}</p>
                        <p className="text-sm text-[var(--text-muted)]">
                          Scheduled: {new Date(task.scheduled_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                    {task.question && (
                      <p className="text-sm mb-3 rounded-lg bg-[var(--surface-1)] p-3">{task.question}</p>
                    )}
                    <FollowUpResponseForm taskId={task.id} />
                  </Card>
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold text-[var(--text-muted)]">Completed</h2>
              <div className="space-y-3">
                {past.map((task) => (
                  <Card key={task.id} padding className="!p-4 opacity-90">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium">{task.medicine_name ?? "Follow-up"}</p>
                      <StatusBadge status={task.status} />
                    </div>
                    {task.response && (
                      <p className="text-sm text-[var(--text-muted)] mt-2">Your response: {task.response}</p>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
