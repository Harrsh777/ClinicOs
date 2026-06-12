"use client";

import { useState } from "react";
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
    tagline?: string;
  } | null;
}

export function BrandingForm({ clinicId, branding }: BrandingFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    <Card>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="tagline" label="Tagline" defaultValue={branding?.tagline ?? ""} placeholder="Your health, our priority" />
          <Input name="whatsappNumber" label="WhatsApp Business Number" defaultValue={branding?.whatsapp_number ?? ""} placeholder="+91 98765 43210" />
          <Input name="logoUrl" label="Logo URL" defaultValue={branding?.logo_url ?? ""} placeholder="https://..." />
          <Input name="customDomain" label="Custom Domain" defaultValue={branding?.custom_domain ?? ""} placeholder="clinic.example.com" />
          <div>
            <label className="clinic-label">Primary Color</label>
            <input type="color" name="primaryColor" defaultValue={branding?.primary_color ?? "#0ea5e9"} className="mt-1 h-10 w-full rounded cursor-pointer" />
          </div>
          <div>
            <label className="clinic-label">Secondary Color</label>
            <input type="color" name="secondaryColor" defaultValue={branding?.secondary_color ?? "#14b8a6"} className="mt-1 h-10 w-full rounded cursor-pointer" />
          </div>
        </div>

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
      </form>
    </Card>
  );
}
