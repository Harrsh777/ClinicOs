import { NextRequest, NextResponse } from "next/server";
import { patientPortalLoginAction, patientOtpLoginAction } from "@/lib/actions/patient-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, clinicSlug, phone, password } = body as {
      mode?: "password" | "otp";
      clinicSlug?: string;
      phone?: string;
      password?: string;
    };

    if (!clinicSlug || !phone) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (mode === "otp") {
      const result = await patientOtpLoginAction(clinicSlug, phone);
      if (result.error) {
        const status = result.error === "no_account" ? 404 : 400;
        return NextResponse.json(result, { status });
      }
      return NextResponse.json(result);
    }

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const result = await patientPortalLoginAction({ clinicSlug, phone, password });
    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result ?? { success: true });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
