import { NextRequest, NextResponse } from "next/server";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { sendPortalOtp } from "@/lib/portal/otp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clinicSlug, phone } = body as { clinicSlug?: string; phone?: string };

    if (!clinicSlug || !phone) {
      return NextResponse.json({ error: "Missing clinic or phone" }, { status: 400 });
    }

    const clinic = await getPublicClinicBySlug(clinicSlug);
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

    const result = await sendPortalOtp(clinic.id, phone);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
