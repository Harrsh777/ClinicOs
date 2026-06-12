import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: unpaidBills } = await service
    .from("bills")
    .select("id, clinic_id, total_amount, created_at, patients(full_name)")
    .in("status", ["unpaid", "partial"])
    .lt("created_at", sevenDaysAgo.toISOString());

  const { data: consultationsWithoutBills } = await service
    .from("consultations")
    .select("id, clinic_id, patients(full_name)")
    .eq("status", "completed")
    .is("bills", null);

  return NextResponse.json({
    success: true,
    unpaidOver7Days: unpaidBills?.length ?? 0,
    missingBills: consultationsWithoutBills?.length ?? 0,
    timestamp: new Date().toISOString(),
  });
}
