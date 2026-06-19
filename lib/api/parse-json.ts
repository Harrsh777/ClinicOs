import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function parseJsonBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { error: NextResponse.json({ error: "Invalid request data" }, { status: 400 }) };
  }

  return { data: parsed.data };
}
