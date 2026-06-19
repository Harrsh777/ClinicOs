import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { requirePortalSession } from "@/lib/portal/session";
import { generateQueueTokenWithSeriesForClient } from "@/lib/actions/appointments";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clinicSlug, bookingId, phone } = body as {
      clinicSlug?: string;
      bookingId?: string;
      phone?: string;
    };

    if (!clinicSlug || !bookingId || !phone) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const clinic = await getPublicClinicBySlug(clinicSlug);
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

    const auth = await requirePortalSession(phone, clinic.id);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

    const service = await createServiceClient();
    const today = new Date().toISOString().split("T")[0];
    const normalized = phone.replace(/\D/g, "").slice(-10);

    const { data: visit } = await service
      .from("clinic_visits")
      .select("*, patients!inner(phone), appointments(doctor_id, appointment_date)")
      .eq("booking_id", bookingId.toUpperCase())
      .eq("clinic_id", clinic.id)
      .maybeSingle();

    if (!visit) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const patientPhone = (visit.patients as { phone: string }).phone?.slice(-10);
    if (patientPhone !== normalized) {
      return NextResponse.json({ error: "Phone number does not match booking" }, { status: 403 });
    }

    if (visit.payment_status === "pending") {
      return NextResponse.json({ error: "Payment pending — complete payment first" }, { status: 400 });
    }

    if (visit.check_in_status === "in_queue" && visit.token_label) {
      return NextResponse.json({ success: true, bookingId: visit.booking_id, tokenLabel: visit.token_label });
    }

    const apt = visit.appointments as { doctor_id: string; appointment_date: string } | null;
    if (apt && apt.appointment_date !== today) {
      return NextResponse.json({
        error: `Check-in opens on ${apt.appointment_date}. Your booking is confirmed.`,
      }, { status: 400 });
    }

    let tokenLabel = visit.token_label;
    if (!visit.queue_token_id) {
      const tokenResult = await generateQueueTokenWithSeriesForClient(
        service,
        clinic.id,
        visit.patient_id,
        "regular",
        {
          appointmentId: visit.appointment_id ?? undefined,
          doctorId: apt?.doctor_id,
          priority: "normal",
          paymentStatus: visit.payment_status as "paid",
          visitId: visit.id,
        }
      );

      if (tokenResult.error) return NextResponse.json({ error: tokenResult.error }, { status: 500 });

      tokenLabel = tokenResult.token?.token_label ?? null;
      await service
        .from("clinic_visits")
        .update({
          queue_token_id: tokenResult.token?.id,
          token_label: tokenLabel,
          check_in_status: "in_queue",
          checked_in_at: new Date().toISOString(),
        })
        .eq("id", visit.id);
    }

    return NextResponse.json({ success: true, bookingId: visit.booking_id, tokenLabel });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
