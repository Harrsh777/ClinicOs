import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface PublicClinic {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  consultation_fee_default: number;
  opening_hours: Record<string, { open: string; close: string } | null>;
  portal: {
    walkInEnabled: boolean;
    maxDailyWalkIns: number;
  };
  branding: {
    primary_color: string;
    secondary_color: string;
    logo_url: string | null;
    tagline: string | null;
    white_label: boolean;
    whatsapp_number: string | null;
  } | null;
}

export async function getPublicClinicBySlug(slug: string): Promise<PublicClinic | null> {
  const supabase = await createClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, slug, logo_url, address, city, phone, consultation_fee_default, opening_hours")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!clinic) return null;

  const { data: branding } = await supabase
    .from("clinic_branding")
    .select("primary_color, secondary_color, logo_url, tagline, white_label, whatsapp_number, portal_walk_in_enabled, portal_max_daily_walk_ins")
    .eq("clinic_id", clinic.id)
    .maybeSingle();

  return {
    ...clinic,
    opening_hours: (clinic.opening_hours ?? {}) as PublicClinic["opening_hours"],
    portal: {
      walkInEnabled: branding?.portal_walk_in_enabled ?? true,
      maxDailyWalkIns: branding?.portal_max_daily_walk_ins ?? 200,
    },
    branding: branding
      ? {
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          logo_url: branding.logo_url,
          tagline: branding.tagline,
          white_label: branding.white_label,
          whatsapp_number: branding.whatsapp_number,
        }
      : null,
  };
}

export async function getPublicClinicByDomain(domain: string): Promise<string | null> {
  const host = domain.split(":")[0].toLowerCase();
  const supabase = await createClient();
  const { data } = await supabase
    .from("clinic_branding")
    .select("clinics!inner(slug, status)")
    .eq("custom_domain", host)
    .maybeSingle();

  const clinic = (data?.clinics as unknown as { slug: string; status: string } | null);
  if (!clinic || clinic.status !== "active") return null;
  return clinic.slug;
}

export async function getPublicDoctors(clinicId: string) {
  const service = await createServiceClient();
  const { data } = await service
    .from("doctors")
    .select("id, consultation_fee, slot_duration_mins, profiles(full_name, specialization, avatar_url)")
    .eq("clinic_id", clinicId)
    .eq("is_accepting_appointments", true);
  return data ?? [];
}

export async function getPublicVisitByBookingId(bookingId: string, clinicId: string) {
  const service = await createServiceClient();
  const { data } = await service
    .from("clinic_visits")
    .select("*, patients(full_name, phone), appointments(appointment_date, appointment_time, doctors(profiles(full_name)))")
    .eq("booking_id", bookingId.toUpperCase())
    .eq("clinic_id", clinicId)
    .maybeSingle();
  return data;
}
