import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processScribeTranscript } from "@/lib/ai/scribe";
import { z } from "zod";

const schema = z.object({
  transcript: z.string().min(10).max(10000),
  consultationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, clinic_id")
    .eq("id", user.id)
    .single();

  if (!profile?.clinic_id || !["doctor", "clinic_owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await processScribeTranscript(profile.clinic_id, parsed.data.transcript);
  return NextResponse.json({ success: true, data: result });
}
