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
    portal_walk_in_enabled?: boolean;
    portal_max_daily_walk_ins?: number;
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
