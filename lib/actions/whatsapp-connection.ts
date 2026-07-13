"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createOAuthState, completeEmbeddedSignup } from "@/lib/whatsapp/embedded-signup";
import {
  getActiveConnection,
  disconnectWhatsApp,
  getClinicWhatsAppCredentials,
} from "@/lib/whatsapp/connections";
import { isMetaConfigured } from "@/lib/whatsapp/meta-client";

const ADMIN_ROLES = ["clinic_owner", "administrator"] as const;

export async function getWhatsAppConnectionStatusAction() {
  const profile = await requireRole([...ADMIN_ROLES, "receptionist"]);
  if (!profile.clinic_id) {
    return {
      connected: false,
      connection: null,
      metaConfigured: isMetaConfigured(),
      appId: process.env.NEXT_PUBLIC_META_APP_ID ?? null,
      configId: process.env.NEXT_PUBLIC_META_CONFIG_ID ?? null,
    };
  }

  const connection = await getActiveConnection(profile.clinic_id);
  return {
    connected: !!connection,
    connection,
    metaConfigured: isMetaConfigured(),
    appId: process.env.NEXT_PUBLIC_META_APP_ID ?? null,
    configId: process.env.NEXT_PUBLIC_META_CONFIG_ID ?? null,
  };
}

export async function initiateWhatsAppConnectAction() {
  const profile = await requireRole([...ADMIN_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const state = await createOAuthState(profile.clinic_id, profile.id);
  return {
    state,
    appId: process.env.NEXT_PUBLIC_META_APP_ID ?? null,
    configId: process.env.NEXT_PUBLIC_META_CONFIG_ID ?? null,
    metaConfigured: isMetaConfigured(),
  };
}

export async function completeWhatsAppConnectAction(params: {
  code: string;
  state: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  businessName?: string;
  metaBusinessId?: string;
}) {
  const profile = await requireRole([...ADMIN_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const result = await completeEmbeddedSignup({
    clinicId: profile.clinic_id,
    profileId: profile.id,
    code: params.code,
    state: params.state,
    session: {
      wabaId: params.wabaId,
      phoneNumberId: params.phoneNumberId,
      displayPhoneNumber: params.displayPhoneNumber,
      businessName: params.businessName,
      metaBusinessId: params.metaBusinessId,
    },
  });

  if (!result.success) return { error: result.error ?? "Connection failed" };

  revalidatePath("/owner/conversations");
  revalidatePath("/receptionist/conversations");
  return { success: true, connectionId: result.connectionId };
}

export async function disconnectWhatsAppAction() {
  const profile = await requireRole([...ADMIN_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const result = await disconnectWhatsApp(profile.clinic_id);
  if (!result.success) return { error: result.error };

  revalidatePath("/owner/conversations");
  return { success: true };
}

export async function simulateWhatsAppConnectAction() {
  const profile = await requireRole([...ADMIN_ROLES]);
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  if (process.env.NODE_ENV === "production") {
    return { error: "Simulation is only available in development" };
  }

  const state = await createOAuthState(profile.clinic_id, profile.id);
  const result = await completeEmbeddedSignup({
    clinicId: profile.clinic_id,
    profileId: profile.id,
    code: "simulated",
    state,
    session: {
      wabaId: `sim_waba_${profile.clinic_id.slice(0, 8)}`,
      phoneNumberId: `sim_phone_${profile.clinic_id.slice(0, 8)}`,
      displayPhoneNumber: "+91 98765 43210",
      businessName: "Demo WhatsApp",
    },
  });

  if (!result.success) return { error: result.error };
  revalidatePath("/owner/conversations");
  return { success: true };
}

export async function getWhatsAppCredentialsForClinic(clinicId: string) {
  return getClinicWhatsAppCredentials(clinicId);
}
