import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { formatReminderReply } from "@/lib/ai/appointment-bot";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";

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
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: appointments } = await service
    .from("appointments")
    .select(`
      id, clinic_id, appointment_date, appointment_time, booking_symptoms,
      patients(id, full_name, phone),
      clinics(name)
    `)
    .eq("appointment_date", tomorrowStr)
    .in("status", ["confirmed", "pending"]);

  let sent = 0;
  let failed = 0;

  for (const apt of appointments ?? []) {
    const patient = apt.patients as unknown as { id: string; full_name: string; phone: string };
    const clinicInfo = apt.clinics as unknown as { name: string };

    if (!patient?.phone) continue;

    const { data: existing } = await service
      .from("whatsapp_messages")
      .select("id")
      .eq("clinic_id", apt.clinic_id)
      .eq("patient_phone", patient.phone)
      .eq("intent", "reminder")
      .contains("metadata", { appointment_id: apt.id })
      .maybeSingle();

    if (existing) continue;

    const message = formatReminderReply(
      apt.appointment_date,
      apt.appointment_time,
      clinicInfo.name,
      apt.booking_symptoms ?? undefined
    );

    const result = await sendWhatsAppMessage({
      clinicId: apt.clinic_id,
      patientId: patient.id,
      patientPhone: patient.phone,
      content: message,
      intent: "reminder",
      metadata: { appointment_id: apt.id },
    });

    if (result.success) sent++;
    else failed++;
  }

  return NextResponse.json({ success: true, remindersSent: sent, failed });
}
