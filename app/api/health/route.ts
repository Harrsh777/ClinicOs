import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const checks: Record<string, string> = { api: "ok", timestamp: new Date().toISOString() };

  try {
    const service = await createServiceClient();
    const { error } = await service.from("clinics").select("id").limit(1);
    checks.database = error ? "error" : "ok";
    if (error) checks.databaseError = error.message;
  } catch (e) {
    checks.database = "error";
    checks.databaseError = e instanceof Error ? e.message : "Unknown";
  }

  const healthy = checks.database === "ok";
  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks },
    { status: healthy ? 200 : 503 }
  );
}
