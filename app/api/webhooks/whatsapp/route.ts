import { NextResponse } from "next/server";
import { updateWhatsAppDeliveryStatus } from "@/lib/whatsapp/send";
import {
  extractMetaInboundMessage,
  processInboundWhatsApp,
} from "@/lib/whatsapp/inbound";

function verifyWebhook(request: Request): boolean {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return true;
  return request.headers.get("x-webhook-secret") === secret;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: "whatsapp_webhook_ready" });
}

export async function POST(request: Request) {
  if (!verifyWebhook(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entry = (body.entry as { changes?: { value?: { statuses?: { id: string; status: string; errors?: { title: string }[] }[] } }[] }[])?.[0];
  const statuses = entry?.changes?.[0]?.value?.statuses;
  if (statuses?.length) {
    for (const status of statuses) {
      const mapped =
        status.status === "delivered"
          ? "delivered"
          : status.status === "read"
            ? "read"
            : status.status === "failed"
              ? "failed"
              : null;
      if (mapped) {
        await updateWhatsAppDeliveryStatus(status.id, mapped, status.errors?.[0]?.title);
      }
    }
    return NextResponse.json({ success: true });
  }

  const metaInbound = extractMetaInboundMessage(body);
  if (metaInbound) {
    const result = await processInboundWhatsApp(metaInbound);
    return NextResponse.json({ success: true, ...result });
  }

  const legacy = body as {
    clinicId?: string;
    from?: string;
    phone?: string;
    message?: string;
    text?: string;
  };

  const phone = legacy.from ?? legacy.phone;
  const message = legacy.message ?? legacy.text;
  if (!phone || !message) {
    return NextResponse.json({ error: "Missing phone or message" }, { status: 400 });
  }

  const result = await processInboundWhatsApp({
    phone,
    message,
    clinicId: legacy.clinicId,
  });

  return NextResponse.json({ success: true, ...result });
}
