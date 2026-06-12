"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { calculateBillTotals } from "@/lib/billing/calculator";

export async function getMedicines(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pharmacy_medicines")
    .select("*, pharmacy_stock(*)")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function createMedicineAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pharmacy_medicines")
    .insert({
      clinic_id: profile.clinic_id,
      name: formData.get("name") as string,
      generic_name: (formData.get("genericName") as string) || null,
      unit: (formData.get("unit") as string) || "tablet",
      reorder_level: parseInt(formData.get("reorderLevel") as string, 10) || 50,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/owner/pharmacy");
  return { success: true, medicineId: data.id };
}

export async function addStockAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const medicineId = formData.get("medicineId") as string;
  const quantity = parseInt(formData.get("quantity") as string, 10);

  const { error } = await supabase.from("pharmacy_stock").upsert(
    {
      clinic_id: profile.clinic_id,
      medicine_id: medicineId,
      batch_number: formData.get("batchNumber") as string,
      quantity,
      expiry_date: formData.get("expiryDate") as string,
      purchase_price: parseFloat(formData.get("purchasePrice") as string) || null,
      selling_price: parseFloat(formData.get("sellingPrice") as string) || null,
    },
    { onConflict: "medicine_id,batch_number" }
  );

  if (error) return { error: error.message };

  const expiryDate = new Date(formData.get("expiryDate") as string);
  const daysUntil = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 30 && daysUntil > 0) {
    const { data: med } = await supabase.from("pharmacy_medicines").select("name").eq("id", medicineId).single();
    await supabase.from("inventory_alerts").insert({
      clinic_id: profile.clinic_id,
      medicine_id: medicineId,
      alert_type: "expiry",
      message: `${med?.name} batch expires in ${daysUntil} days`,
    });
  }

  revalidatePath("/owner/pharmacy");
  return { success: true };
}

export async function dispenseMedicineAction(params: {
  prescriptionItemId: string;
  medicineId: string;
  stockId: string;
  patientId: string;
  quantity: number;
  billId?: string;
}) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();

  const { data: stock } = await supabase
    .from("pharmacy_stock")
    .select("quantity, selling_price, pharmacy_medicines(name)")
    .eq("id", params.stockId)
    .single();

  if (!stock || stock.quantity < params.quantity) {
    return { error: "Insufficient stock" };
  }

  await supabase
    .from("pharmacy_stock")
    .update({ quantity: stock.quantity - params.quantity })
    .eq("id", params.stockId);

  await supabase.from("pharmacy_dispense").insert({
    clinic_id: profile.clinic_id,
    prescription_item_id: params.prescriptionItemId,
    medicine_id: params.medicineId,
    stock_id: params.stockId,
    patient_id: params.patientId,
    quantity: params.quantity,
    dispensed_by: profile.id,
  });

  const sellingPrice = Number(stock.selling_price ?? 0);
  const lineAmount = sellingPrice * params.quantity;

  if (params.billId && lineAmount > 0) {
    const med = stock.pharmacy_medicines as unknown as { name: string } | null;
    const medName = med?.name ?? "Medicine";
    await supabase.from("bill_line_items").insert({
      bill_id: params.billId,
      clinic_id: profile.clinic_id,
      description: `Pharmacy: ${medName} x${params.quantity}`,
      item_type: "medicine",
      quantity: params.quantity,
      unit_price: sellingPrice,
      amount: lineAmount,
    });

    const { data: items } = await supabase
      .from("bill_line_items")
      .select("amount")
      .eq("bill_id", params.billId);
    const { data: settings } = await supabase
      .from("clinic_billing_settings")
      .select("tax_rate")
      .eq("clinic_id", profile.clinic_id)
      .maybeSingle();
    const totals = calculateBillTotals(items ?? [], Number(settings?.tax_rate ?? 0));
    await supabase
      .from("bills")
      .update({
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
        patient_amount: totals.totalAmount,
      })
      .eq("id", params.billId);
  }

  const { data: med } = await supabase
    .from("pharmacy_medicines")
    .select("reorder_level, name")
    .eq("id", params.medicineId)
    .single();

  const { data: totalStock } = await supabase
    .from("pharmacy_stock")
    .select("quantity")
    .eq("medicine_id", params.medicineId);

  const totalQty = (totalStock ?? []).reduce((s, r) => s + r.quantity, 0);
  if (med && totalQty <= med.reorder_level) {
    await supabase.from("inventory_alerts").insert({
      clinic_id: profile.clinic_id,
      medicine_id: params.medicineId,
      alert_type: "low_stock",
      message: `${med.name} is low on stock (${totalQty} remaining)`,
    });
  }

  revalidatePath("/owner/pharmacy");
  return { success: true };
}

export async function getExpiryAlerts(clinicId: string) {
  const supabase = await createClient();
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const { data } = await supabase
    .from("pharmacy_stock")
    .select("*, pharmacy_medicines(name)")
    .eq("clinic_id", clinicId)
    .lte("expiry_date", in30Days.toISOString().split("T")[0])
    .gt("quantity", 0)
    .order("expiry_date");
  return data ?? [];
}
