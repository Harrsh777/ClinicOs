import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { buildFollowUpQuestion } from "@/lib/ai/follow-up";
import { logAIUsage } from "@/lib/ai/usage-logger";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: prescriptions } = await service
    .from("prescriptions")
    .select(`
      id, clinic_id, patient_id, created_at,
      patients(full_name, phone),
      prescription_items(medicine_name)
    `)
    .gte("created_at", threeDaysAgo.toISOString())
    .lte("created_at", new Date(threeDaysAgo.getTime() + 86400000).toISOString());

  let sent = 0;

  for (const rx of prescriptions ?? []) {
    const items = rx.prescription_items as unknown as { medicine_name: string }[] | null;
    const medicine = items?.[0]?.medicine_name;
    if (!medicine) continue;

    const { data: existing } = await service
      .from("follow_up_tasks")
      .select("id")
      .eq("prescription_id", rx.id)
      .single();

    if (existing) continue;

    const question = buildFollowUpQuestion(medicine);
    const patient = rx.patients as unknown as { full_name: string; phone: string };

    await service.from("follow_up_tasks").insert({
      clinic_id: rx.clinic_id,
      patient_id: rx.patient_id,
      prescription_id: rx.id,
      medicine_name: medicine,
      scheduled_at: new Date().toISOString(),
      status: "sent",
      sent_at: new Date().toISOString(),
      question,
    });

    await service.from("whatsapp_messages").insert({
      clinic_id: rx.clinic_id,
      patient_phone: patient.phone,
      direction: "outbound",
      content: question,
      intent: "follow_up",
    });

    await logAIUsage(rx.clinic_id, "follow_up", 0, { prescriptionId: rx.id });
    sent++;
  }

  return NextResponse.json({ success: true, followUpsSent: sent });
}
