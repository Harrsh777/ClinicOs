"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { generatePatientAIBrief } from "@/lib/ai/patient-brief";
import type { PatientAIBrief } from "@/lib/engagement/types";

export async function getPatientAIBriefAction(
  patientId: string
): Promise<PatientAIBrief | null> {
  const profile = await requireRole(["doctor", "clinic_owner", "receptionist"]);
  if (!profile.clinic_id) return null;

  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name, clinic_id")
    .eq("id", patientId)
    .single();

  if (!patient || patient.clinic_id !== profile.clinic_id) return null;

  const [emrResult, rxResult, remindersResult, aptResult] = await Promise.all([
    supabase
      .from("emr_records")
      .select("visit_number, created_at, summary")
      .eq("patient_id", patientId)
      .order("visit_number", { ascending: false })
      .limit(5),
    supabase
      .from("prescriptions")
      .select("prescription_items(medicine_name)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("follow_up_reminders")
      .select(
        "follow_up_date, status, diagnosis, patient_response, recovery_analysis, responded_at"
      )
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("appointments")
      .select("appointment_date, status")
      .eq("patient_id", patientId)
      .in("status", ["no_show", "cancelled"])
      .order("appointment_date", { ascending: false })
      .limit(5),
  ]);

  const medicines: string[] = [];
  for (const rx of rxResult.data ?? []) {
    const items = rx.prescription_items as { medicine_name: string }[] | { medicine_name: string };
    const list = Array.isArray(items) ? items : [items];
    for (const item of list) {
      if (item?.medicine_name) medicines.push(item.medicine_name);
    }
  }

  const brief = await generatePatientAIBrief(profile.clinic_id, {
    patientName: patient.full_name,
    emrRecords: emrResult.data ?? [],
    activeMedicines: [...new Set(medicines)],
    reminders: (remindersResult.data ?? []).map((r) => ({
      follow_up_date: r.follow_up_date,
      status: r.status,
      diagnosis: r.diagnosis,
      patient_response: r.patient_response,
      recovery_analysis: r.recovery_analysis as Record<string, unknown> | null,
      responded_at: r.responded_at,
    })),
    missedAppointments: (aptResult.data ?? []).map((a) => ({
      date: a.appointment_date,
      status: a.status,
    })),
  });

  await supabase.from("patient_ai_briefs").upsert(
    {
      clinic_id: profile.clinic_id,
      patient_id: patientId,
      brief,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "clinic_id,patient_id" }
  );

  return brief;
}
