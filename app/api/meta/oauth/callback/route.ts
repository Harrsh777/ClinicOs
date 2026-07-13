import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { completeEmbeddedSignup } from "@/lib/whatsapp/embedded-signup";

function verifyMetaSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return !secret;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const received = signature.slice(7);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken =
    process.env.META_WEBHOOK_VERIFY_TOKEN ?? process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const wabaId = searchParams.get("waba_id");
  const phoneNumberId = searchParams.get("phone_number_id");

  if (code && state && wabaId && phoneNumberId) {
    const [clinicId] = state.split(":");
    const result = await completeEmbeddedSignup({
      clinicId,
      profileId: "oauth-callback",
      code,
      state,
      session: { wabaId, phoneNumberId },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (result.success) {
      return NextResponse.redirect(`${baseUrl}/owner/conversations?connected=1`);
    }
    return NextResponse.redirect(
      `${baseUrl}/owner/conversations?error=${encodeURIComponent(result.error ?? "Connection failed")}`
    );
  }

  return NextResponse.json({ status: "meta_oauth_callback_ready" });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (process.env.META_APP_SECRET && !verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
