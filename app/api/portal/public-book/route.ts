import { NextRequest, NextResponse } from "next/server";
import { createPublicBookingAction } from "@/lib/actions/public-portal";
import { guardPortalRequest, checkIdempotency, saveIdempotentResponse } from "@/lib/portal/api-guard";

export async function POST(request: NextRequest) {
  const blocked = await guardPortalRequest(request, {
    scope: "portal-public-book",
    rateKey: "public-book",
    maxHits: 10,
    windowSeconds: 60,
  });
  if (blocked) return blocked;

  const idem = await checkIdempotency(request, "portal-public-book");
  if (idem.hit) return idem.response;

  try {
    const body = await request.json();
    const result = await createPublicBookingAction(body);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    await saveIdempotentResponse(idem.key, "portal-public-book", result, 200);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
