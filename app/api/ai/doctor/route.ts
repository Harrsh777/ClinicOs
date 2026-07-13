import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askDoctorAssistant } from "@/lib/ai/doctor-assistant";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

const schema = z.object({
  question: z.string().min(3).max(4000),
  history: z.array(messageSchema).max(20).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const result = await askDoctorAssistant(
    profile.clinic_id,
    parsed.data.question,
    parsed.data.history ?? []
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ success: true, answer: result.answer });
}
