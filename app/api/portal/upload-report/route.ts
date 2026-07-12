import { NextRequest, NextResponse } from "next/server";
import { getPublicClinicBySlug } from "@/lib/portal/clinic-public";
import { secureTenantUpload } from "@/lib/storage/secure-upload";
import { guardPortalRequest } from "@/lib/portal/api-guard";
import { isValidUuid } from "@/lib/security/sanitize";

export async function POST(request: NextRequest) {
  const blocked = await guardPortalRequest(request, {
    scope: "portal-upload",
    rateKey: "upload-report",
    maxHits: 20,
    windowSeconds: 60,
  });
  if (blocked) return blocked;

  try {
    const formData = await request.formData();
    const clinicSlug = String(formData.get("clinicSlug") ?? "");
    const patientId = String(formData.get("patientId") ?? "");
    const file = formData.get("file") as File | null;

    if (!clinicSlug || !patientId || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isValidUuid(patientId)) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }

    const clinic = await getPublicClinicBySlug(clinicSlug);
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

    const result = await secureTenantUpload({
      clinicId: clinic.id,
      patientId,
      file,
      documentType: "report",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, path: result.path, documentId: result.documentId });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
