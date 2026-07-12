import { NextRequest, NextResponse } from "next/server";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { getAvailableDatesForDoctor } from "@/lib/portal/slots";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const clinicSlug = searchParams.get("clinicSlug");
  const doctorId = searchParams.get("doctorId");

  if (!clinicSlug || !doctorId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const clinic = await getPublicClinicBySlug(clinicSlug);
  if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  const dates = await getAvailableDatesForDoctor(doctorId, clinic.id);
  return NextResponse.json({ dates });
}
