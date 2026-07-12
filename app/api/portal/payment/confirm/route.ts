import { NextRequest, NextResponse } from "next/server";
import { confirmPortalPaymentAction } from "@/lib/actions/public-portal";
import { guardPortalRequest, checkIdempotency, saveIdempotentResponse } from "@/lib/portal/api-guard";

export async function POST(request: NextRequest) {
  const blocked = await guardPortalRequest(request, {
    scope: "portal-payment-confirm",
    rateKey: "payment-confirm",
    maxHits: 15,
    windowSeconds: 60,
  });
  if (blocked) return blocked;

  const idem = await checkIdempotency(request, "portal-payment-confirm");
  if (idem.hit) return idem.response;

  try {
    const body = await request.json();
    const result = await confirmPortalPaymentAction(body);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    await saveIdempotentResponse(idem.key, "portal-payment-confirm", result, 200);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
