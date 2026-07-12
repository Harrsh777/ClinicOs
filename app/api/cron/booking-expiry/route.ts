import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Expire abandoned online bookings whose payment hold has timed out */
export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();
  const { data, error } = await service.rpc("expire_stale_pending_bookings");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, expiredCount: data ?? 0 });
}
