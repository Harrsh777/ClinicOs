import { NextRequest, NextResponse } from "next/server";
import { registerPatientAccountAction } from "@/lib/actions/patient-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await registerPatientAccountAction(body);
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result ?? { success: true });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
