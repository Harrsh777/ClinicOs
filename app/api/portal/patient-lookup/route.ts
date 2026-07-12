import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { lookupPortalPatient } from "@/lib/portal/patient-upsert";
import { guardPortalRequest } from "@/lib/portal/api-guard";

export async function POST(request: NextRequest) {
  const blocked = await guardPortalRequest(request, {
    scope: "portal-patient-lookup",
    rateKey: "patient-lookup",
    maxHits: 30,
    windowSeconds: 60,
  });
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const { clinicSlug, phone, email } = body;

    if (!clinicSlug || !phone) {
      return NextResponse.json({ error: "Clinic slug and phone required" }, { status: 400 });
    }

    const clinic = await getPublicClinicBySlug(clinicSlug);
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

    const service = await createServiceClient();
    const result = await lookupPortalPatient(service, clinic.id, phone, email);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
