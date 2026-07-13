import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { updateWhatsAppDeliveryStatus } from "@/lib/whatsapp/send";
import {
  extractMetaInboundMessage,
  processInboundWhatsApp,
} from "@/lib/whatsapp/inbound";

function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return true;
  return request.headers.get("x-webhook-secret") === secret;
}

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
  return NextResponse.json({ status: "whatsapp_webhook_ready" });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (process.env.META_APP_SECRET) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
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
