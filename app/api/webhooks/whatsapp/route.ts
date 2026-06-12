import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  parseAppointmentMessage,
  formatBookingReply,
  formatReminderReply,
} from "@/lib/ai/appointment-bot";
import { parseFollowUpResponse, getFollowUpStatus } from "@/lib/ai/follow-up";
import { logAIUsage } from "@/lib/ai/usage-logger";

function verifyWebhook(request: Request): boolean {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return true;
  return request.headers.get("x-webhook-secret") === secret;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: "whatsapp_webhook_ready" });
}

export async function POST(request: Request) {
  if (!verifyWebhook(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    clinicId?: string;
    from?: string;
    message?: string;
    phone?: string;
    text?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = body.from ?? body.phone ?? "";
  const message = body.message ?? body.text ?? "";
  const clinicId = body.clinicId;

  if (!phone || !message) {
    return NextResponse.json({ error: "Missing phone or message" }, { status: 400 });
  }

  const service = await createServiceClient();

  let resolvedClinicId = clinicId;
  if (!resolvedClinicId) {
    const { data: branding } = await service
      .from("clinic_branding")
      .select("clinic_id")
      .not("whatsapp_number", "is", null)
      .limit(1)
      .single();
    resolvedClinicId = branding?.clinic_id;
  }

  if (!resolvedClinicId) {
    return NextResponse.json({
      reply: "Welcome to ClinicOS! Please contact your clinic directly to book an appointment.",
    });
  }

  await service.from("whatsapp_messages").insert({
    clinic_id: resolvedClinicId,
    patient_phone: phone,
    direction: "inbound",
    content: message,
  });

  const intent = parseAppointmentMessage(message);
  await logAIUsage(resolvedClinicId, "appointment_bot", 0, { intent: intent.intent });

  let reply = "Thank you for your message. A clinic staff member will respond shortly.";

  if (intent.intent === "book") {
    const { data: patient } = await service
      .from("patients")
      .select("id, full_name")
      .eq("clinic_id", resolvedClinicId)
      .eq("phone", phone.replace(/\D/g, "").slice(-10))
      .single();

    if (!patient) {
      reply = "We couldn't find your patient record. Please visit the clinic to register first.";
    } else {
      const date = intent.date ?? new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const time = intent.time ?? "10:00";

      const { data: doctor } = await service
        .from("doctors")
        .select("id, profiles(full_name)")
        .eq("clinic_id", resolvedClinicId)
        .eq("is_accepting_appointments", true)
        .limit(1)
        .single();

      if (doctor) {
        await service.from("appointments").insert({
          clinic_id: resolvedClinicId,
          patient_id: patient.id,
          doctor_id: doctor.id,
          appointment_date: date,
          appointment_time: time,
          status: "confirmed",
          type: "scheduled",
          priority: "normal",
        });

        reply = formatBookingReply(
          patient.full_name,
          date,
          time,
          (doctor.profiles as unknown as { full_name: string })?.full_name ?? "Doctor"
        );
      }
    }
  } else if (intent.intent === "status") {
    const { data: patient } = await service
      .from("patients")
      .select("id")
      .eq("clinic_id", resolvedClinicId)
      .eq("phone", phone.replace(/\D/g, "").slice(-10))
      .single();

    if (patient) {
      const { data: apt } = await service
        .from("appointments")
        .select("appointment_date, appointment_time, status")
        .eq("patient_id", patient.id)
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .order("appointment_date")
        .limit(1)
        .single();

      reply = apt
        ? `Your next appointment is on ${apt.appointment_date} at ${apt.appointment_time} (${apt.status}).`
        : "You have no upcoming appointments.";
    }
  }

  const followUpResponse = parseFollowUpResponse(message);
  if (followUpResponse !== "unknown") {
    const status = getFollowUpStatus(followUpResponse);
    await service
      .from("follow_up_tasks")
      .update({ status, response: message, responded_at: new Date().toISOString() })
      .eq("clinic_id", resolvedClinicId)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(1);

    reply = followUpResponse === "yes"
      ? "Great! Keep taking your medicines as prescribed. Feel free to reach out if you have concerns."
      : "Thank you for letting us know. Your doctor will be notified. Please contact the clinic if you need help.";
  }

  await service.from("whatsapp_messages").insert({
    clinic_id: resolvedClinicId,
    patient_phone: phone,
    direction: "outbound",
    content: reply,
    intent: intent.intent,
  });

  return NextResponse.json({ success: true, reply, intent: intent.intent });
}
