import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { confirmRazorpayPayment } from "@/lib/actions/billing";
import { isWebhookProcessed, markWebhookProcessed } from "@/lib/security/idempotency";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (secret) {
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; amount: number } } };
  };

  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id") ?? `${event.event}:${event.payload?.payment?.entity?.id ?? body.slice(0, 64)}`;

  if (await isWebhookProcessed("razorpay", eventId)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json({ error: "Missing payment payload" }, { status: 400 });
    }

    const orderId = payment.order_id;
    const amount = payment.amount / 100;

    const supabase = await createServiceClient();
    const { data: pendingPayment } = await supabase
      .from("payments")
      .select("bill_id, visit_id")
      .eq("gateway_ref", orderId)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingPayment?.visit_id && pendingPayment.bill_id) {
      const { fulfillPortalPayment } = await import("@/lib/actions/public-portal");
      await fulfillPortalPayment(pendingPayment.visit_id, pendingPayment.bill_id, payment.id, amount);
    } else if (pendingPayment?.bill_id) {
      await confirmRazorpayPayment(pendingPayment.bill_id, orderId, payment.id, amount);
    }

    await markWebhookProcessed("razorpay", eventId, event.event, {
      order_id: orderId,
      payment_id: payment.id,
    });
  }

  return NextResponse.json({ received: true });
}
