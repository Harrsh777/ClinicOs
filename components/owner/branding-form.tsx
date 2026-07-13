"use client";

import { useState } from "react";
import Image from "next/image";
import { updateClinicBrandingAction } from "@/lib/actions/platform-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface BrandingFormProps {
  clinicId: string;
  branding: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    custom_domain?: string;
    white_label?: boolean;
    whatsapp_number?: string;
    whatsapp_meta_phone_id?: string;
    tagline?: string;
    portal_walk_in_enabled?: boolean;
    portal_max_daily_walk_ins?: number;
  } | null;
}

export function BrandingForm({ clinicId, branding }: BrandingFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(branding?.logo_url ?? null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("clinicId", clinicId);
    const result = await updateClinicBrandingAction(fd);
    setMessage(result?.error ?? "Branding saved successfully");
    setLoading(false);
  }

  return (
    <Card className="p-6">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <p className="mb-1 text-sm font-semibold">Logo preview</p>
            <p className="mb-4 text-xs text-[var(--text-secondary)]">Used on patient portal, login surfaces, and branded documents.</p>
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--border)] bg-white">
              {logoPreview ? (
                <Image src={logoPreview} alt="Clinic logo preview" width={180} height={96} className="max-h-24 w-auto object-contain" unoptimized />
              ) : (
                <div className="text-center text-sm text-[var(--text-secondary)]">
                  <span className="mx-auto mb-2 block h-10 w-10 rounded-2xl bg-teal-50" />
                  Upload your clinic logo
                </div>
              )}
            </div>
            <label className="mt-4 block">
              <span className="clinic-label">Upload Logo</span>
              <input
                type="file"
                name="logoFile"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="block w-full cursor-pointer rounded-2xl border border-[var(--border)] bg-white p-3 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--primary)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setLogoPreview(URL.createObjectURL(file));
                }}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
          <Input name="tagline" label="Tagline" defaultValue={branding?.tagline ?? ""} placeholder="Your health, our priority" />
          <Input name="whatsappNumber" label="WhatsApp Business Number" defaultValue={branding?.whatsapp_number ?? ""} placeholder="+91 98765 43210" />
          <Input name="whatsappMetaPhoneId" label="Meta Phone Number ID" defaultValue={branding?.whatsapp_meta_phone_id ?? ""} placeholder="From Meta Business Manager" />
          <Input name="logoUrl" label="Logo URL fallback" defaultValue={branding?.logo_url ?? ""} placeholder="https://..." />
          <Input name="customDomain" label="Custom Domain" defaultValue={branding?.custom_domain ?? ""} placeholder="clinic.example.com" />
          <div>
            <label className="clinic-label">Primary Color</label>
            <input type="color" name="primaryColor" defaultValue={branding?.primary_color ?? "#0F172A"} className="mt-1 h-11 w-full cursor-pointer rounded-2xl border border-[var(--border)] bg-white p-1" />
          </div>
          <div>
            <label className="clinic-label">Secondary Color</label>
            <input type="color" name="secondaryColor" defaultValue={branding?.secondary_color ?? "#14B8A6"} className="mt-1 h-11 w-full cursor-pointer rounded-2xl border border-[var(--border)] bg-white p-1" />
          </div>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="portalWalkInEnabled"
            defaultChecked={branding?.portal_walk_in_enabled ?? true}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
          <div>
            <span className="text-sm font-medium">Enable Online Walk-in</span>
            <p className="text-xs text-[var(--text-muted)]">Let patients join the live queue and pay online at /c/your-slug/walk-in</p>
          </div>
        </label>

        <Input
          name="portalMaxDailyWalkIns"
          label="Max daily online walk-ins"
          type="number"
          min={1}
          max={1000}
          defaultValue={branding?.portal_max_daily_walk_ins ?? 200}
        />

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="whiteLabel"
            defaultChecked={branding?.white_label ?? false}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
          <div>
            <span className="text-sm font-medium">Enable White-Label</span>
            <p className="text-xs text-[var(--text-muted)]">Hide ClinicOS branding on patient-facing pages</p>
          </div>
        </label>

        {message && (
          <p className={`text-sm ${message.includes("success") ? "text-[var(--success-700)]" : "text-[var(--danger-500)]"}`}>
            {message}
          </p>
        )}

        <Button type="submit" loading={loading}>Save Branding</Button>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm">
          <p className="font-medium mb-1">Patient portal URL</p>
          <p className="text-[var(--text-muted)]">
            Share <span className="font-mono text-[var(--brand-600)]">/c/your-clinic-slug</span> or{" "}
            <span className="font-mono text-[var(--brand-600)]">/c/your-clinic-slug/walk-in</span> with patients.
            Set a custom domain above to serve the portal on your own website.
          </p>
        </div>
      </form>
    </Card>
  );
}
