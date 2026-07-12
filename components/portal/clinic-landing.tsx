import Link from "next/link";
import { Calendar, MapPin, Phone, Clock, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PublicClinic } from "@/lib/portal/clinic-public";

interface Doctor {
  id: string;
  consultation_fee: number | null;
  profiles?: { full_name: string; specialization: string | null } | { full_name: string; specialization: string | null }[];
}

export function ClinicLanding({
  clinic,
  doctors,
}: {
  clinic: PublicClinic;
  doctors: Doctor[];
}) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">{clinic.name}</h1>
        {clinic.branding?.tagline && (
          <p className="mt-2 text-[var(--text-secondary)]">{clinic.branding.tagline}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/c/${clinic.slug}/walk-in`}>
            <Button size="lg" className="gap-2">
              <Clock className="h-5 w-5" />
              Walk-in Now
            </Button>
          </Link>
          <Link href={`/c/${clinic.slug}/bookings`}>
            <Button variant="secondary" size="lg" className="gap-2">
              <Calendar className="h-5 w-5" />
              Book Appointment
            </Button>
          </Link>
          <Link href={`/c/${clinic.slug}/check-in`}>
            <Button variant="secondary" size="lg" className="gap-2">
              <QrCode className="h-5 w-5" />
              Check In
            </Button>
          </Link>
          <Link href={`/c/${clinic.slug}/login`}>
            <Button variant="ghost" size="lg">
              Patient Sign In
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {clinic.address && (
          <Card className="flex gap-3 items-start">
            <MapPin className="h-5 w-5 text-[var(--brand-500)] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Address</p>
              <p className="text-sm text-[var(--text-muted)]">{clinic.address}{clinic.city ? `, ${clinic.city}` : ""}</p>
            </div>
          </Card>
        )}
        {clinic.phone && (
          <Card className="flex gap-3 items-start">
            <Phone className="h-5 w-5 text-[var(--brand-500)] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Phone</p>
              <p className="text-sm text-[var(--text-muted)]">{clinic.phone}</p>
            </div>
          </Card>
        )}
        <Card className="flex gap-3 items-start">
          <Clock className="h-5 w-5 text-[var(--brand-500)] shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Consultation from</p>
            <p className="text-sm text-[var(--text-muted)]">₹{clinic.consultation_fee_default}</p>
          </div>
        </Card>
      </div>

      {doctors.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Our Doctors</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {doctors.map((d) => {
              const p = d.profiles;
              const name = Array.isArray(p) ? p[0]?.full_name : p?.full_name;
              const spec = Array.isArray(p) ? p[0]?.specialization : p?.specialization;
              return (
                <Card key={d.id} hover>
                  <p className="font-medium">{name ?? "Doctor"}</p>
                  {spec && <p className="text-sm text-[var(--text-muted)]">{spec}</p>}
                  <p className="text-sm text-[var(--brand-600)] mt-1">₹{d.consultation_fee ?? clinic.consultation_fee_default}</p>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Card className="text-center bg-[var(--brand-50)] border-[var(--brand-200)]">
        <p className="text-sm text-[var(--brand-700)]">
          Walk in now for an instant queue token, or book a slot for later. Pay securely online — your token syncs to reception live.
        </p>
      </Card>
    </div>
  );
}
