import Image from "next/image";
import { MapPin, Phone, Mail, Globe, Clock, Ambulance, Car, Accessibility } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PublicClinic } from "@/lib/portal/clinic-public";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface PublicDoctor {
  id: string;
  consultation_fee: number | null;
  slot_duration_mins: number;
  degree?: string | null;
  experience_years?: number | null;
  registration_number?: string | null;
  languages?: string[] | null;
  biography?: string | null;
  specialization?: string | null;
  profiles?: { full_name: string; specialization: string | null; avatar_url: string | null } | { full_name: string; specialization: string | null; avatar_url: string | null }[];
}

function doctorProfile(d: PublicDoctor) {
  const p = d.profiles;
  return Array.isArray(p) ? p[0] : p;
}

export function PublicBookingShowcase({
  clinic,
  doctors,
  schedules,
}: {
  clinic: PublicClinic;
  doctors: PublicDoctor[];
  schedules: { doctor_id: string; day_of_week: number; start_time: string; end_time: string }[];
}) {
  const logo = clinic.branding?.logo_url ?? clinic.logo_url;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        {logo && (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <Image src={logo} alt={clinic.name} fill className="object-contain p-2" unoptimized />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{clinic.name}</h1>
          {clinic.branding?.tagline && (
            <p className="mt-1 text-[var(--text-secondary)]">{clinic.branding.tagline}</p>
          )}
        </div>
      </div>

      {doctors.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Our Doctors</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {doctors.map((d) => {
              const profile = doctorProfile(d);
              const name = profile?.full_name ?? "Doctor";
              const spec = d.specialization ?? profile?.specialization;
              const fee = d.consultation_fee ?? clinic.fees.normal;
              const doctorSchedules = schedules.filter((s) => s.doctor_id === d.id);
              return (
                <Card key={d.id} className="!p-5">
                  <div className="flex gap-4">
                    {profile?.avatar_url ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
                        <Image src={profile.avatar_url} alt={name} fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-lg font-semibold text-[var(--brand-600)]">
                        {name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--text-primary)]">{name}</p>
                      {d.degree && <p className="text-sm text-[var(--text-secondary)]">{d.degree}</p>}
                      {spec && <p className="text-sm text-[var(--brand-600)]">{spec}</p>}
                      {d.experience_years != null && (
                        <p className="text-xs text-[var(--text-muted)]">{d.experience_years}+ years experience</p>
                      )}
                      <p className="mt-2 text-sm font-medium">Consultation: ₹{fee}</p>
                      {d.languages?.length ? (
                        <p className="text-xs text-[var(--text-muted)]">Languages: {d.languages.join(", ")}</p>
                      ) : null}
                    </div>
                  </div>
                  {d.biography && (
                    <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-3">{d.biography}</p>
                  )}
                  {doctorSchedules.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {doctorSchedules.map((s) => (
                        <span key={s.day_of_week} className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs">
                          {DAY_LABELS[s.day_of_week]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 !p-5">
          <h3 className="font-semibold">Clinic Information</h3>
          {clinic.address && (
            <p className="flex gap-2 text-sm text-[var(--text-secondary)]">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--brand-500)]" />
              {[clinic.address, clinic.city, clinic.state, clinic.pincode].filter(Boolean).join(", ")}
            </p>
          )}
          {clinic.phone && (
            <p className="flex gap-2 text-sm"><Phone className="h-4 w-4 text-[var(--brand-500)]" />{clinic.phone}</p>
          )}
          {clinic.email && (
            <p className="flex gap-2 text-sm"><Mail className="h-4 w-4 text-[var(--brand-500)]" />{clinic.email}</p>
          )}
          {clinic.website && (
            <p className="flex gap-2 text-sm"><Globe className="h-4 w-4 text-[var(--brand-500)]" />{clinic.website}</p>
          )}
          <div className="flex flex-wrap gap-3 pt-2 text-xs text-[var(--text-muted)]">
            {clinic.emergency_available && <span className="flex items-center gap-1"><Ambulance className="h-3.5 w-3.5" /> Emergency</span>}
            {clinic.parking_available && <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" /> Parking</span>}
            {clinic.wheelchair_access && <span className="flex items-center gap-1"><Accessibility className="h-3.5 w-3.5" /> Wheelchair access</span>}
          </div>
          {clinic.other_facilities.length > 0 && (
            <p className="text-xs text-[var(--text-muted)]">Facilities: {clinic.other_facilities.join(", ")}</p>
          )}
        </Card>

        <Card className="!p-5">
          <h3 className="mb-3 font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Working Hours</h3>
          <div className="space-y-1.5 text-sm">
            {DAY_KEYS.map((key, i) => {
              const hours = clinic.opening_hours[key];
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{DAY_LABELS[i]}</span>
                  <span>{hours ? `${hours.open} – ${hours.close}` : "Closed"}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 border-t border-[var(--border)] pt-3 text-sm">
            <div className="flex justify-between"><span>Normal</span><span>₹{clinic.fees.normal}</span></div>
            {clinic.fees.emergency != null && <div className="flex justify-between"><span>Emergency</span><span>₹{clinic.fees.emergency}</span></div>}
            {clinic.fees.video != null && <div className="flex justify-between"><span>Video</span><span>₹{clinic.fees.video}</span></div>}
          </div>
        </Card>
      </div>

      {(clinic.google_maps_link || (clinic.latitude && clinic.longitude)) && (
        <Card className="overflow-hidden !p-0">
          {clinic.google_maps_link ? (
            <iframe
              title="Clinic location"
              src={clinic.google_maps_link.includes("embed") ? clinic.google_maps_link : `https://maps.google.com/maps?q=${encodeURIComponent(clinic.address ?? clinic.name)}&output=embed`}
              className="h-64 w-full border-0"
              loading="lazy"
            />
          ) : (
            <iframe
              title="Clinic location"
              src={`https://maps.google.com/maps?q=${clinic.latitude},${clinic.longitude}&z=15&output=embed`}
              className="h-64 w-full border-0"
              loading="lazy"
            />
          )}
        </Card>
      )}

      {clinic.facility_images.length > 0 && (
        <section>
          <h3 className="mb-3 font-semibold">Clinic Gallery</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {clinic.facility_images.map((url) => (
              <div key={url} className="relative aspect-video overflow-hidden rounded-xl border border-[var(--border)]">
                <Image src={url} alt="Clinic" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
