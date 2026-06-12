import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportPLCsv } from "@/lib/actions/accounting";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, clinic_id")
    .eq("id", user.id)
    .single();

  if (!profile?.clinic_id || !["clinic_owner", "finance_manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];

  const csv = await exportPLCsv(profile.clinic_id, from, to);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="pl-report-${from}-${to}.csv"`,
    },
  });
}
