import { NextRequest, NextResponse } from "next/server";
import { createPortalWalkInAction } from "@/lib/actions/public-portal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createPortalWalkInAction(body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
