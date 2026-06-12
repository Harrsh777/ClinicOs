"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

export async function getInventoryItems(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function createInventoryItemAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_items").insert({
    clinic_id: profile.clinic_id,
    name: formData.get("name") as string,
    category: (formData.get("category") as string) || "supplies",
    unit: (formData.get("unit") as string) || "piece",
    quantity: parseInt(formData.get("quantity") as string, 10) || 0,
    reorder_level: parseInt(formData.get("reorderLevel") as string, 10) || 20,
  });

  if (error) return { error: error.message };
  revalidatePath("/owner/inventory");
  return { success: true };
}

export async function recordInventoryTxAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const itemId = formData.get("itemId") as string;
  const txType = formData.get("txType") as "in" | "out" | "adjustment";
  const quantity = parseInt(formData.get("quantity") as string, 10);

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("inventory_items")
    .select("quantity, reorder_level, name")
    .eq("id", itemId)
    .single();

  if (!item) return { error: "Item not found" };

  let newQty = item.quantity;
  if (txType === "in") newQty += quantity;
  else if (txType === "out") newQty = Math.max(0, newQty - quantity);
  else newQty = quantity;

  await supabase.from("inventory_transactions").insert({
    clinic_id: profile.clinic_id,
    item_id: itemId,
    tx_type: txType,
    quantity,
    reason: (formData.get("reason") as string) || null,
    recorded_by: profile.id,
  });

  await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", itemId);

  if (newQty <= item.reorder_level) {
    await supabase.from("inventory_alerts").insert({
      clinic_id: profile.clinic_id,
      item_id: itemId,
      alert_type: "low_stock",
      message: `${item.name} is below reorder level (${newQty} ${formData.get("unit") ?? "units"} left)`,
    });
  }

  revalidatePath("/owner/inventory");
  return { success: true };
}

export async function getLowStockAlerts(clinicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_alerts")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("is_resolved", false)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getPendingLabOrderCount(clinicId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("lab_orders")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .in("status", ["ordered", "sample_collected", "processing"]);
  return count ?? 0;
}
