import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyVisitSignature } from "@/lib/visits/qr";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const { visitId } = await params;
  const { searchParams } = new URL(request.url);
  const signature = searchParams.get("sig") ?? searchParams.get("signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature parameter" }, { status: 400 });
  }

  if (!verifyVisitSignature(visitId, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, clinic_id")
    .eq("id", user.id)
    .single();

  if (!profile?.clinic_id || !["receptionist", "clinic_owner", "doctor"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: visit } = await supabase
    .from("clinic_visits")
    .select("*, patients(id, full_name, phone, patient_code, date_of_birth, gender)")
    .eq("visit_code", visitId)
    .eq("clinic_id", profile.clinic_id)
    .single();

  if (!visit) {
    return NextResponse.json({ error: "Visit not found at this clinic" }, { status: 404 });
  }

  let canCheckIn = true;
  let blockReason: string | undefined;

  if (visit.check_in_status === "checked_in" || visit.check_in_status === "in_queue") {
    canCheckIn = false;
    blockReason = "Already checked in";
  } else if (visit.check_in_status === "completed" || visit.check_in_status === "cancelled") {
    canCheckIn = false;
    blockReason = "Visit closed";
  } else if (visit.payment_status === "pending") {
    canCheckIn = false;
    blockReason = "Payment pending";
  }

  return NextResponse.json({
    success: true,
    visit: {
      visitId: visit.visit_code,
      bookingId: visit.booking_id,
      tokenLabel: visit.token_label,
      paymentStatus: visit.payment_status,
      checkInStatus: visit.check_in_status,
      visitType: visit.visit_type,
    },
    patient: visit.patients,
    canCheckIn,
    blockReason,
  });
}
