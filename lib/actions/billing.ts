"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { calculateBillTotals, deriveBillStatus } from "@/lib/billing/calculator";
import {
  readEmergencyFeeFromSettings,
  type ClinicFeeSetup,
} from "@/lib/billing/clinic-fees";
import { z } from "zod";
import {
  addClinicCalendarDays,
  formatClinicDateLabel,
  getClinicDayBoundsUtc,
  getTodayDateInClinicTz,
  toClinicDateKey,
} from "@/lib/portal/clinic-hours";

export async function getClinicFeeSetup(clinicId: string): Promise<ClinicFeeSetup> {
  const supabase = await createClient();
  const [{ data: clinic }, { data: billing }, { data: doctors }] = await Promise.all([
    supabase.from("clinics").select("consultation_fee_default, settings").eq("id", clinicId).single(),
    supabase
      .from("clinic_billing_settings")
      .select("tax_rate, payment_methods")
      .eq("clinic_id", clinicId)
      .maybeSingle(),
    supabase.from("doctors").select("id, consultation_fee").eq("clinic_id", clinicId),
  ]);

  const normalFee = Number(clinic?.consultation_fee_default ?? 500);
  const emergencyFee = readEmergencyFeeFromSettings(
    clinic?.settings as Record<string, unknown> | undefined,
    normalFee
  );

  const doctorFees: Record<string, number> = {};
  for (const doctor of doctors ?? []) {
    if (doctor.consultation_fee != null) {
      doctorFees[doctor.id] = Number(doctor.consultation_fee);
    }
  }

  const methods = (billing?.payment_methods ?? {
    cash: true,
    upi: true,
    card: true,
  }) as Record<string, boolean>;

  return {
    normalFee,
    emergencyFee,
    taxRate: Number(billing?.tax_rate ?? 0),
    paymentMethods: {
      cash: methods.cash !== false,
      upi: methods.upi !== false,
      card: methods.card !== false,
    },
    doctorFees,
  };
}

export async function createWalkInBillWithPayment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    clinicId: string;
    patientId: string;
    appointmentId: string;
    visitId?: string;
    amount: number;
    taxRate: number;
    feeType: string;
    paymentMethod: "cash" | "card" | "upi";
    recordedBy: string;
    chiefComplaint?: string;
  }
) {
  const lineAmount = params.amount;
  const { subtotal, taxAmount, totalAmount } = calculateBillTotals(
    [{ amount: lineAmount }],
    params.taxRate
  );

  const { data: invoiceNum } = await supabase.rpc("generate_invoice_number", {
    p_clinic_id: params.clinicId,
  });

  const feeLabel =
    params.feeType === "emergency"
      ? "Emergency Consultation Fee"
      : params.feeType === "custom"
        ? "Consultation Fee (Custom)"
        : "Walk-in Consultation Fee";

  const { data: bill, error: billErr } = await supabase
    .from("bills")
    .insert({
      clinic_id: params.clinicId,
      patient_id: params.patientId,
      invoice_number: invoiceNum ?? `INV-${Date.now()}`,
      status: "paid",
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      paid_amount: totalAmount,
      patient_amount: totalAmount,
      notes: params.chiefComplaint ? `Walk-in: ${params.chiefComplaint}` : "Walk-in consultation",
      created_by: params.recordedBy,
    })
    .select()
    .single();

  if (billErr) return { error: billErr.message };

  await supabase.from("bill_line_items").insert({
    bill_id: bill.id,
    clinic_id: params.clinicId,
    description: feeLabel,
    item_type: "consultation",
    quantity: 1,
    unit_price: lineAmount,
    amount: lineAmount,
    reference_id: params.appointmentId,
  });

  const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
  const { error: payErr } = await supabase.from("payments").insert({
    bill_id: bill.id,
    clinic_id: params.clinicId,
    patient_id: params.patientId,
    visit_id: params.visitId ?? null,
    amount: totalAmount,
    method: params.paymentMethod,
    status: "completed",
    receipt_number: receiptNumber,
    recorded_by: params.recordedBy,
    paid_at: new Date().toISOString(),
  });

  if (payErr) return { error: payErr.message };

  return {
    success: true,
    billId: bill.id,
    invoiceNumber: bill.invoice_number,
    receiptNumber,
    totalAmount,
  };
}

function revalidateBillingPaths() {
  revalidatePath("/owner/billing");
  revalidatePath("/receptionist/billing");
  revalidatePath("/finance/billing");
  revalidatePath("/owner/revenue");
  revalidatePath("/owner");
  revalidatePath("/finance");
}

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

  revalidateBillingPaths();
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

  revalidateBillingPaths();
  return { success: true, receiptNumber };
}

export async function createRazorpayOrderAction(billId: string) {
  await requireAuth();
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
  revalidateBillingPaths();
  return { success: true };
}

export async function getRevenueStats(clinicId: string) {
  const supabase = await createClient();
  const todayClinic = getTodayDateInClinicTz();
  const { start: todayStart, end: todayEnd } = getClinicDayBoundsUtc(todayClinic);
  const monthStartDate = `${todayClinic.slice(0, 7)}-01`;
  const { start: monthStart } = getClinicDayBoundsUtc(monthStartDate);

  const [
    { data: todayPaid },
    { data: todayFallback },
    { data: monthPaid },
    { data: monthFallback },
    { data: unpaidBills },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .gte("paid_at", todayStart)
      .lte("paid_at", todayEnd),
    supabase
      .from("payments")
      .select("amount")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .is("paid_at", null)
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),
    supabase
      .from("payments")
      .select("amount")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .gte("paid_at", monthStart)
      .lte("paid_at", todayEnd),
    supabase
      .from("payments")
      .select("amount")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .is("paid_at", null)
      .gte("created_at", monthStart)
      .lte("created_at", todayEnd),
    supabase
      .from("bills")
      .select("total_amount, paid_amount")
      .eq("clinic_id", clinicId)
      .in("status", ["unpaid", "partial"]),
  ]);

  const sum = (rows: { amount?: number; total_amount?: number; paid_amount?: number }[], field: string) =>
    rows.reduce((s, r) => s + Number((r as Record<string, number>)[field] ?? 0), 0);

  const todayPayments = [...(todayPaid ?? []), ...(todayFallback ?? [])];
  const monthPayments = [...(monthPaid ?? []), ...(monthFallback ?? [])];

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

export async function getRevenueAnalytics(clinicId: string) {
  const supabase = await createClient();
  const todayClinic = getTodayDateInClinicTz();
  const rangeStartDate = addClinicCalendarDays(todayClinic, -13);
  const { start: rangeStart } = getClinicDayBoundsUtc(rangeStartDate);
  const { end: rangeEnd } = getClinicDayBoundsUtc(todayClinic);

  const [{ data: paidInRange }, { data: fallbackInRange }, { data: bills }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, method, paid_at, created_at")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .gte("paid_at", rangeStart)
      .lte("paid_at", rangeEnd),
    supabase
      .from("payments")
      .select("amount, method, paid_at, created_at")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .is("paid_at", null)
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
    supabase
      .from("bills")
      .select("status, total_amount, paid_amount, created_at")
      .eq("clinic_id", clinicId)
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
  ]);

  const payments = [...(paidInRange ?? []), ...(fallbackInRange ?? [])];

  const revenueByDay = new Map<string, { date: string; revenue: number; invoices: number }>();

  for (let i = 13; i >= 0; i--) {
    const key = addClinicCalendarDays(todayClinic, -i);
    revenueByDay.set(key, {
      date: formatClinicDateLabel(key),
      revenue: 0,
      invoices: 0,
    });
  }

  for (const payment of payments ?? []) {
    const timestamp = payment.paid_at ?? payment.created_at;
    if (!timestamp) continue;
    const key = toClinicDateKey(String(timestamp));
    const day = revenueByDay.get(key);
    if (day) day.revenue += Number(payment.amount ?? 0);
  }

  for (const bill of bills ?? []) {
    if (!bill.created_at) continue;
    const key = toClinicDateKey(String(bill.created_at));
    const day = revenueByDay.get(key);
    if (day) day.invoices += 1;
  }

  const methodTotals = new Map<string, number>();
  for (const payment of payments ?? []) {
    const method = String(payment.method ?? "other").replace(/_/g, " ");
    methodTotals.set(method, (methodTotals.get(method) ?? 0) + Number(payment.amount ?? 0));
  }

  const unpaidTotal = (bills ?? []).reduce(
    (sum, bill) => sum + Math.max(0, Number(bill.total_amount ?? 0) - Number(bill.paid_amount ?? 0)),
    0
  );
  const collectedTotal = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  return {
    dailyRevenue: Array.from(revenueByDay.values()),
    paymentMix: Array.from(methodTotals.entries()).map(([method, amount]) => ({ method, amount })),
    collectionHealth: [
      { name: "Collected", value: collectedTotal },
      { name: "Outstanding", value: unpaidTotal },
    ],
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
