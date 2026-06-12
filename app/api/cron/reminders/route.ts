import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { formatReminderReply } from "@/lib/ai/appointment-bot";

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
      clinic_id, appointment_date, appointment_time,
      patients(full_name, phone),
      clinics(name)
    `)
    .eq("appointment_date", tomorrowStr)
    .in("status", ["confirmed", "pending"]);

  let sent = 0;

  for (const apt of appointments ?? []) {
    const patient = apt.patients as unknown as { full_name: string; phone: string };
    const clinicInfo = apt.clinics as unknown as { name: string };
    const message = formatReminderReply(
      apt.appointment_date,
      apt.appointment_time,
      clinicInfo.name
    );

    await service.from("whatsapp_messages").insert({
      clinic_id: apt.clinic_id,
      patient_phone: patient.phone,
      direction: "outbound",
      content: message,
      intent: "reminder",
    });
    sent++;
  }

  return NextResponse.json({ success: true, remindersSent: sent });
}
