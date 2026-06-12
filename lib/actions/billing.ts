"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { calculateBillTotals, deriveBillStatus } from "@/lib/billing/calculator";
import { z } from "zod";

export async function getBills(clinicId: string, status?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("bills")
    .select("*, patients(full_name, phone), bill_line_items(*)")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  const { data } = await query;
  return data ?? [];
}

export async function getBill(billId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bills")
    .select("*, patients(*), bill_line_items(*), payments(*)")
    .eq("id", billId)
    .single();
  return data;
}

export async function getPatientBills(patientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bills")
    .select("*, bill_line_items(*), payments(*)")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function addBillLineItemAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const billId = formData.get("billId") as string;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const itemType = (formData.get("itemType") as string) || "other";

  const supabase = await createClient();

  await supabase.from("bill_line_items").insert({
    bill_id: billId,
    clinic_id: profile.clinic_id,
    description,
    item_type: itemType,
    quantity: 1,
    unit_price: amount,
    amount,
  });

  const { data: items } = await supabase
    .from("bill_line_items")
    .select("amount")
    .eq("bill_id", billId);

  const { data: settings } = await supabase
    .from("clinic_billing_settings")
    .select("tax_rate")
    .eq("clinic_id", profile.clinic_id)
    .maybeSingle();

  const { subtotal, taxAmount, totalAmount } = calculateBillTotals(
    items ?? [],
    Number(settings?.tax_rate ?? 0)
  );

  await supabase
    .from("bills")
    .update({ subtotal, tax_amount: taxAmount, total_amount: totalAmount, patient_amount: totalAmount })
    .eq("id", billId);

  revalidatePath("/receptionist/billing");
  return { success: true };
}

export async function recordCashPaymentAction(billId: string, amount: number) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { data: bill } = await supabase.from("bills").select("*").eq("id", billId).single();
  if (!bill) return { error: "Bill not found" };

  const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;

  await supabase.from("payments").insert({
    bill_id: billId,
    clinic_id: profile.clinic_id,
    patient_id: bill.patient_id,
    amount,
    method: "cash",
    status: "completed",
    receipt_number: receiptNumber,
    recorded_by: profile.id,
    paid_at: new Date().toISOString(),
  });

  const newPaid = Number(bill.paid_amount) + amount;
  const status = deriveBillStatus(Number(bill.total_amount), newPaid);

  await supabase
    .from("bills")
    .update({ paid_amount: newPaid, status })
    .eq("id", billId);

  revalidatePath("/receptionist/billing");
  revalidatePath("/finance/billing");
  return { success: true, receiptNumber };
}

export async function createRazorpayOrderAction(billId: string) {
  const profile = await requireAuth();
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return { error: "Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to env." };
  }

  const supabase = await createClient();
  const { data: bill } = await supabase.from("bills").select("*").eq("id", billId).single();
  if (!bill) return { error: "Bill not found" };

  const amountDue = Math.round((Number(bill.total_amount) - Number(bill.paid_amount)) * 100);

  const Razorpay = (await import("razorpay")).default;
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const order = await razorpay.orders.create({
    amount: amountDue,
    currency: "INR",
    receipt: bill.invoice_number,
    notes: { bill_id: billId, clinic_id: bill.clinic_id },
  });

  await supabase.from("payments").insert({
    bill_id: billId,
    clinic_id: bill.clinic_id,
    patient_id: bill.patient_id,
    amount: amountDue / 100,
    method: "upi",
    status: "pending",
    gateway_ref: order.id,
  });

  return { success: true, orderId: order.id, amount: amountDue, keyId };
}

export async function confirmRazorpayPayment(
  billId: string,
  orderId: string,
  paymentId: string,
  amount: number
) {
  const supabase = await createClient();
  const { data: bill } = await supabase.from("bills").select("*").eq("id", billId).single();
  if (!bill) return { error: "Bill not found" };

  await supabase
    .from("payments")
    .update({
      status: "completed",
      gateway_ref: paymentId,
      receipt_number: `RZP-${paymentId.slice(-8).toUpperCase()}`,
      paid_at: new Date().toISOString(),
    })
    .eq("gateway_ref", orderId);

  const newPaid = Number(bill.paid_amount) + amount;
  const status = deriveBillStatus(Number(bill.total_amount), newPaid);

  await supabase.from("bills").update({ paid_amount: newPaid, status }).eq("id", billId);

  revalidatePath("/patient/billing");
  revalidatePath("/receptionist/billing");
  return { success: true };
}

export async function getRevenueStats(clinicId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  const [{ data: todayPayments }, { data: monthPayments }, { data: unpaidBills }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .gte("paid_at", `${today}T00:00:00`),
    supabase
      .from("payments")
      .select("amount")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .gte("paid_at", `${monthStart}T00:00:00`),
    supabase
      .from("bills")
      .select("total_amount, paid_amount")
      .eq("clinic_id", clinicId)
      .in("status", ["unpaid", "partial"]),
  ]);

  const sum = (rows: { amount?: number; total_amount?: number; paid_amount?: number }[], field: string) =>
    rows.reduce((s, r) => s + Number((r as Record<string, number>)[field] ?? 0), 0);

  return {
    todayRevenue: sum(todayPayments ?? [], "amount"),
    monthRevenue: sum(monthPayments ?? [], "amount"),
    unpaidCount: unpaidBills?.length ?? 0,
    unpaidTotal: (unpaidBills ?? []).reduce(
      (s, b) => s + Number(b.total_amount) - Number(b.paid_amount),
      0
    ),
  };
}

const insuranceSplitSchema = z.object({
  billId: z.string().uuid(),
  policyId: z.string().uuid(),
});

export async function applyInsuranceSplitAction(formData: FormData) {
  const profile = await requireAuth();
  const parsed = insuranceSplitSchema.safeParse({
    billId: formData.get("billId"),
    policyId: formData.get("policyId"),
  });
  if (!parsed.success) return { error: "Invalid data" };

  const supabase = await createClient();
  const [{ data: bill }, { data: policy }] = await Promise.all([
    supabase.from("bills").select("*").eq("id", parsed.data.billId).single(),
    supabase.from("insurance_policies").select("*").eq("id", parsed.data.policyId).single(),
  ]);

  if (!bill || !policy) return { error: "Bill or policy not found" };

  const insuranceAmount = Math.round(Number(bill.total_amount) * (Number(policy.coverage_percent) / 100) * 100) / 100;
  const patientAmount = Number(bill.total_amount) - insuranceAmount;

  await supabase
    .from("bills")
    .update({ insurance_amount: insuranceAmount, patient_amount: patientAmount })
    .eq("id", parsed.data.billId);

  await supabase.from("insurance_claims").insert({
    clinic_id: profile.clinic_id!,
    policy_id: policy.id,
    bill_id: bill.id,
    patient_id: bill.patient_id,
    claim_amount: insuranceAmount,
    status: "draft",
    created_by: profile.id,
  });

  revalidatePath("/receptionist/billing");
  revalidatePath("/receptionist/insurance");
  return { success: true, insuranceAmount, patientAmount };
}
