import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { confirmRazorpayPayment } from "@/lib/actions/billing";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (secret && signature) {
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  const event = JSON.parse(body);

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id;
    const amount = payment.amount / 100;

    const supabase = await createServiceClient();
    const { data: pendingPayment } = await supabase
      .from("payments")
      .select("bill_id")
      .eq("gateway_ref", orderId)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingPayment?.bill_id) {
      await confirmRazorpayPayment(pendingPayment.bill_id, orderId, payment.id, amount);
    }
  }

  return NextResponse.json({ received: true });
}
