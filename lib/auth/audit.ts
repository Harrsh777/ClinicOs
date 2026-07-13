import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

export async function logAuditEvent(params: {
  clinicId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const service = await createServiceClient();
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? null;
  const userAgent = hdrs.get("user-agent") ?? null;

  await service.from("audit_logs").insert({
    clinic_id: params.clinicId,
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: {
      ...params.metadata,
      ip,
      user_agent: userAgent,
    },
  });
}

export async function logPlatformAuditEvent(params: {
  adminId?: string | null;
  action: string;
  targetClinicId?: string;
  details?: Record<string, unknown>;
}) {
  const service = await createServiceClient();
  await service.from("platform_audit_logs").insert({
    admin_id: params.adminId ?? null,
    action: params.action,
    target_clinic_id: params.targetClinicId ?? null,
    details: { ...params.details, source: params.adminId ? "profile" : "platform_password_admin" },
  });
}
