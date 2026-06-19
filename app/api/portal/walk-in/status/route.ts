import { NextRequest, NextResponse } from "next/server";
import { getPortalWalkInStatus } from "@/lib/actions/public-portal";

export async function GET(request: NextRequest) {
  const clinicSlug = request.nextUrl.searchParams.get("clinicSlug");
  if (!clinicSlug) {
    return NextResponse.json({ error: "Missing clinicSlug" }, { status: 400 });
  }

  const status = await getPortalWalkInStatus(clinicSlug);
  if (!status) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  return NextResponse.json(status);
}
