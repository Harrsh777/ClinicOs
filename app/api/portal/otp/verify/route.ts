import { NextRequest, NextResponse } from "next/server";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { verifyPortalOtp } from "@/lib/portal/otp";
import { setPortalSession } from "@/lib/portal/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clinicSlug, phone, code } = body as { clinicSlug?: string; phone?: string; code?: string };

    if (!clinicSlug || !phone || !code) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const clinic = await getPublicClinicBySlug(clinicSlug);
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

    const result = await verifyPortalOtp(clinic.id, phone, code);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    await setPortalSession(result.phone!, clinic.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
