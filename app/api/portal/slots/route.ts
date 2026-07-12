import { NextRequest, NextResponse } from "next/server";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { getAvailableSlotsForDoctor } from "@/lib/portal/slots";
import { guardPortalRequest } from "@/lib/portal/api-guard";

export async function GET(request: NextRequest) {
  const blocked = await guardPortalRequest(request, {
    scope: "portal-slots",
    rateKey: "slots",
    maxHits: 60,
    windowSeconds: 60,
  });
  if (blocked) return blocked;  const { searchParams } = request.nextUrl;
  const clinicSlug = searchParams.get("clinicSlug");
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date");
  const consultationType = searchParams.get("consultationType") as "normal" | "emergency" | "video" | null;

  if (!clinicSlug || !doctorId || !date) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  const slots = await getAvailableSlotsForDoctor({
    doctorId,
    clinicId: clinic.id,
    date,
    consultationType: consultationType ?? "normal",
  });

  return NextResponse.json({ slots });
}
