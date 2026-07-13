import { createServiceClient } from "@/lib/supabase/server";
import { normalizeIndianPhone } from "@/lib/validations/phone";
import { isBookingIntent, parseMenuChoice } from "./menu";

/** Patient replied to a recent retention/broadcast message with booking interest */
export async function isRetentionBookingReply(
  clinicId: string,
  phone: string,
  message: string
): Promise<boolean> {
  const text = message.trim().toLowerCase();
  if (isBookingIntent(message) || parseMenuChoice(message) === "book") return true;

  const affirmative = /^(yes|yeah|yep|ok|okay|sure|interested)$/i.test(text);
  if (!affirmative) return false;

  const service = await createServiceClient();
  const normalized = normalizeIndianPhone(phone);
  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: retentionMsg }, { data: reminder }] = await Promise.all([
    service
      .from("whatsapp_messages")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("patient_phone", normalized)
      .eq("direction", "outbound")
      .in("intent", ["retention_reminder", "engagement_reminder", "broadcast"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    service
      .from("follow_up_reminders")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("patient_phone", normalized)
      .in("status", ["sent", "delivered", "read"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return Boolean(retentionMsg || reminder);
}
