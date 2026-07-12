"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";

export async function getNotificationsAction(limit = 25) {
  const profile = await requireAuth();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, type, is_read, metadata, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUnreadNotificationCountAction() {
  const profile = await requireAuth();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_read", false);
  return count ?? 0;
}

export async function getNotificationBellStateAction(limit = 20) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const [listResult, countResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, body, type, is_read, metadata, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("is_read", false),
  ]);

  return {
    items: listResult.data ?? [],
    unread: countResult.count ?? 0,
  };
}

export async function markNotificationReadAction(notificationId: string) {
  const profile = await requireAuth();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", profile.id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const profile = await requireAuth();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", profile.id)
    .eq("is_read", false);
  revalidatePath("/", "layout");
}
