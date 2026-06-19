"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { analyzeLabResults } from "@/lib/ai/lab-analysis";
import { calculateBillTotals } from "@/lib/billing/calculator";

export async function getLabTests(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lab_tests")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function createLabTestAction(formData: FormData) {
  const profile = await requireRole(["clinic_owner"]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { error } = await supabase.from("lab_tests").insert({
    clinic_id: profile.clinic_id,
    name: formData.get("name") as string,
    code: (formData.get("code") as string).toUpperCase(),
    price: parseFloat(formData.get("price") as string),
    description: (formData.get("description") as string) || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/owner/lab");
  return { success: true };
}

export async function createLabOrderAction(params: {
  patientId: string;
  consultationId?: string;
  doctorId?: string;
  testIds: string[];
}) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { data: tests } = await supabase
    .from("lab_tests")
    .select("id, price, name")
    .in("id", params.testIds);

  if (!tests?.length) return { error: "No tests selected" };

  const { data: order, error } = await supabase
    .from("lab_orders")
    .insert({
      clinic_id: profile.clinic_id,
      patient_id: params.patientId,
      consultation_id: params.consultationId ?? null,
      doctor_id: params.doctorId ?? null,
      ordered_by: profile.id,
      status: "ordered",
    })
    .select()
    .single();

  if (error || !order) return { error: error?.message ?? "Failed to create order" };

  const items = tests.map((t) => ({
    lab_order_id: order.id,
    test_id: t.id,
    price: t.price,
  }));
  await supabase.from("lab_order_items").insert(items);

  const totalLabFee = tests.reduce((s, t) => s + Number(t.price), 0);

  let billId: string | null = null;
  if (params.consultationId) {
    const { data: consultation } = await supabase
      .from("consultations")
      .select("id")
      .eq("id", params.consultationId)
      .single();

    if (consultation) {
      const { data: existingBill } = await supabase
        .from("bills")
        .select("id")
        .eq("consultation_id", params.consultationId)
        .maybeSingle();

      if (existingBill) {
        billId = existingBill.id;
        for (const test of tests) {
          await supabase.from("bill_line_items").insert({
            bill_id: billId,
            clinic_id: profile.clinic_id,
            description: `Lab: ${test.name}`,
            item_type: "lab",
            quantity: 1,
            unit_price: test.price,
            amount: test.price,
            reference_id: order.id,
          });
        }
        const { data: allItems } = await supabase
          .from("bill_line_items")
          .select("amount")
          .eq("bill_id", billId);
        const { data: settings } = await supabase
          .from("clinic_billing_settings")
          .select("tax_rate")
          .eq("clinic_id", profile.clinic_id)
          .maybeSingle();
        const totals = calculateBillTotals(allItems ?? [], Number(settings?.tax_rate ?? 0));
        await supabase
          .from("bills")
          .update({
            subtotal: totals.subtotal,
            tax_amount: totals.taxAmount,
            total_amount: totals.totalAmount,
            patient_amount: totals.totalAmount,
          })
          .eq("id", billId);
      }
    }
  }

  revalidatePath("/doctor/consultations");
  revalidatePath("/receptionist/lab");
  return { success: true, orderId: order.id, totalLabFee };
}

export async function uploadLabReportAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const orderId = formData.get("orderId") as string;
  const resultValuesJson = formData.get("resultValues") as string;
  const file = formData.get("file") as File | null;

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("lab_orders")
    .select("*, lab_order_items(*, lab_tests(name))")
    .eq("id", orderId)
    .single();

  if (!order) return { error: "Order not found" };

  let filePath: string | null = null;
  let fileName: string | null = null;

  if (file && file.size > 0) {
    const ext = file.name.split(".").pop();
    filePath = `${profile.clinic_id}/lab/${orderId}.${ext}`;
    fileName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: storageError } = await supabase.storage.from("clinical-documents").upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });
    if (storageError) return { error: `Upload failed: ${storageError.message}` };
  }

  let resultValues: Record<string, string | number> = {};
  if (resultValuesJson) {
    try {
      resultValues = JSON.parse(resultValuesJson);
    } catch {
      return { error: "Invalid result values JSON" };
    }
  }

  const testNames = (order.lab_order_items as { lab_tests?: { name: string } }[])?.map(
    (i) => i.lab_tests?.name ?? "Test"
  ) ?? [];

  const analysis = await analyzeLabResults(profile.clinic_id, {
    testNames,
    resultValues,
  });

  await supabase.from("ai_usage_logs").insert({
    clinic_id: profile.clinic_id,
    feature: "lab_analysis",
    tokens_used: analysis.tokensUsed,
    metadata: { order_id: orderId },
  });

  await supabase.from("lab_reports").insert({
    lab_order_id: orderId,
    clinic_id: profile.clinic_id,
    patient_id: order.patient_id,
    file_path: filePath,
    file_name: fileName,
    result_values: resultValues,
    ai_summary: analysis.summary,
    ai_abnormal_flags: analysis.abnormalFlags,
    uploaded_by: profile.id,
  });

  await supabase.from("lab_orders").update({ status: "completed" }).eq("id", orderId);

  const { data: patient } = await supabase
    .from("patients")
    .select("user_id")
    .eq("id", order.patient_id)
    .single();

  if (patient?.user_id) {
    await supabase.from("notifications").insert({
      user_id: patient.user_id,
      clinic_id: profile.clinic_id,
      title: "Lab Report Ready",
      body: "Your lab results are available. View them in your patient portal.",
      type: "lab",
    });
  }

  revalidatePath("/receptionist/lab");
  revalidatePath("/patient/lab");
  return { success: true, summary: analysis.summary };
}

export async function getLabOrders(clinicId: string, status?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("lab_orders")
    .select("*, patients(full_name), lab_order_items(*, lab_tests(name, code)), lab_reports(*)")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  const { data } = await query;
  return data ?? [];
}

export async function getPatientLabReports(patientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lab_reports")
    .select("*, lab_orders(*, lab_order_items(*, lab_tests(name)))")
    .eq("patient_id", patientId)
    .order("uploaded_at", { ascending: false });
  return data ?? [];
}

export async function seedDefaultLabTests(clinicId: string) {
  const supabase = await createClient();
  const defaults = [
    { name: "Complete Blood Count (CBC)", code: "CBC", price: 350 },
    { name: "Blood Sugar (Fasting)", code: "FBS", price: 150 },
    { name: "Lipid Profile", code: "LIPID", price: 600 },
    { name: "Thyroid Profile (TSH)", code: "TSH", price: 450 },
    { name: "HbA1c", code: "HBA1C", price: 500 },
  ];
  await supabase.from("lab_tests").upsert(
    defaults.map((d) => ({ ...d, clinic_id: clinicId })),
    { onConflict: "clinic_id,code", ignoreDuplicates: true }
  );
}
