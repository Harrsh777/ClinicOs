import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface PublicClinic {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  consultation_fee_default: number;
  opening_hours: Record<string, { open: string; close: string } | null>;
  google_maps_link: string | null;
  latitude: number | null;
  longitude: number | null;
  facility_images: string[];
  emergency_available: boolean;
  parking_available: boolean;
  wheelchair_access: boolean;
  other_facilities: string[];
  portal: {
    walkInEnabled: boolean;
    maxDailyWalkIns: number;
  };
  fees: {
    normal: number;
    emergency: number | null;
    video: number | null;
  };
  branding: {
    primary_color: string;
    secondary_color: string;
    logo_url: string | null;
    cover_image_url: string | null;
    theme_preset: "clinical_teal" | "kids_pediatric" | "dental_care" | "dermatology_rose" | "emergency_slate" | "holistic_sage";
    specialization_badge: string | null;
    bio_description: string | null;
    tagline: string | null;
    white_label: boolean;
    whatsapp_number: string | null;
    teleconsult_enabled: boolean;
    emergency_enabled: boolean;
  } | null;
}

export async function getPublicClinicBySlug(slug: string): Promise<PublicClinic | null> {
  const supabase = await createClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select(
      "id, name, slug, logo_url, address, city, state, pincode, phone, email, website, consultation_fee_default, opening_hours, portal_enabled, status, google_maps_link, latitude, longitude, facility_images, emergency_available, parking_available, wheelchair_access, other_facilities"
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!clinic) return null;

  const [{ data: branding }, { data: billing }] = await Promise.all([
    supabase
      .from("clinic_branding")
      .select("primary_color, secondary_color, logo_url, cover_image_url, theme_preset, specialization_badge, bio_description, tagline, white_label, whatsapp_number, portal_walk_in_enabled, portal_max_daily_walk_ins, teleconsult_enabled, emergency_enabled")
      .eq("clinic_id", clinic.id)
      .maybeSingle(),
    supabase
      .from("clinic_billing_settings")
      .select("emergency_consultation_fee, video_consultation_fee")
      .eq("clinic_id", clinic.id)
      .maybeSingle(),
  ]);

  return {
    ...clinic,
    state: clinic.state ?? null,
    pincode: clinic.pincode ?? null,
    email: clinic.email ?? null,
    website: clinic.website ?? null,
    google_maps_link: clinic.google_maps_link ?? null,
    latitude: clinic.latitude ?? null,
    longitude: clinic.longitude ?? null,
    facility_images: clinic.facility_images ?? [],
    emergency_available: branding?.emergency_enabled ?? clinic.emergency_available ?? true,
    parking_available: clinic.parking_available ?? false,
    wheelchair_access: clinic.wheelchair_access ?? false,
    other_facilities: clinic.other_facilities ?? [],
    opening_hours: (clinic.opening_hours ?? {}) as PublicClinic["opening_hours"],
    fees: {
      normal: Number(clinic.consultation_fee_default ?? 500),
      emergency: billing?.emergency_consultation_fee != null ? Number(billing.emergency_consultation_fee) : null,
      video: billing?.video_consultation_fee != null ? Number(billing.video_consultation_fee) : 600,
    },
    portal: {
      walkInEnabled: branding?.portal_walk_in_enabled ?? true,
      maxDailyWalkIns: branding?.portal_max_daily_walk_ins ?? 200,
    },
    branding: branding
      ? {
          primary_color: branding.primary_color ?? "#0ea5e9",
          secondary_color: branding.secondary_color ?? "#14b8a6",
          logo_url: branding.logo_url ?? clinic.logo_url ?? null,
          cover_image_url: branding.cover_image_url ?? null,
          theme_preset: branding.theme_preset ?? "clinical_teal",
          specialization_badge: branding.specialization_badge ?? null,
          bio_description: branding.bio_description ?? null,
          tagline: branding.tagline ?? null,
          white_label: branding.white_label ?? false,
          whatsapp_number: branding.whatsapp_number ?? null,
          teleconsult_enabled: branding.teleconsult_enabled ?? true,
          emergency_enabled: branding.emergency_enabled ?? true,
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

  // 1. Query doctors where is_accepting_appointments = true
  const { data } = await service
    .from("doctors")
    .select(
      "id, consultation_fee, slot_duration_mins, degree, experience_years, registration_number, languages, biography, specialization, profiles(full_name, specialization, avatar_url)"
    )
    .eq("clinic_id", clinicId)
    .eq("is_accepting_appointments", true);

  if (data && data.length > 0) {
    return data;
  }

  // 2. Fallback: Doctors exist in clinic without is_accepting_appointments = true
  const { data: allDocs } = await service
    .from("doctors")
    .select(
      "id, consultation_fee, slot_duration_mins, degree, experience_years, registration_number, languages, biography, specialization, profiles(full_name, specialization, avatar_url)"
    )
    .eq("clinic_id", clinicId);

  if (allDocs && allDocs.length > 0) {
    await service
      .from("doctors")
      .update({ is_accepting_appointments: true })
      .eq("clinic_id", clinicId);
    return allDocs;
  }

  // 3. Fallback: Auto-create doctor record for clinic owners/doctors from profiles table
  const { data: profiles } = await service
    .from("profiles")
    .select("id, full_name, specialization, avatar_url")
    .eq("clinic_id", clinicId)
    .in("role", ["clinic_owner", "doctor", "super_admin"]);

  if (profiles && profiles.length > 0) {
    const createdDoctors = [];
    for (const p of profiles) {
      const { data: insertedDoc } = await service
        .from("doctors")
        .insert({
          profile_id: p.id,
          clinic_id: clinicId,
          is_accepting_appointments: true,
        })
        .select("id, consultation_fee, slot_duration_mins, degree, experience_years, registration_number, languages, biography, specialization")
        .single();

      if (insertedDoc) {
        createdDoctors.push({
          ...insertedDoc,
          profiles: {
            full_name: p.full_name,
            specialization: p.specialization,
            avatar_url: p.avatar_url,
          },
        });
      }
    }

    if (createdDoctors.length > 0) {
      return createdDoctors;
    }
  }

  return [];
}

export async function getPublicDoctorSchedules(clinicId: string) {
  const service = await createServiceClient();
  const { data } = await service
    .from("doctor_schedules")
    .select("doctor_id, day_of_week, start_time, end_time")
    .eq("clinic_id", clinicId)
    .eq("is_available", true);
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
