"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Copy, Check, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { getPublicBookingPath } from "@/lib/portal/public-urls";

interface PublicBookingLinkCardProps {
  clinicSlug: string;
  clinicName: string;
  portalEnabled: boolean;
  compact?: boolean;
  setupHref?: string;
}

export function PublicBookingLinkCard({
  clinicSlug,
  clinicName,
  portalEnabled,
  compact = false,
  setupHref = "/owner/onboarding",
}: PublicBookingLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const bookingPath = getPublicBookingPath(clinicSlug);
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${bookingPath}`
      : bookingPath;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        typeof window !== "undefined" ? `${window.location.origin}${bookingPath}` : bookingPath
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!portalEnabled) {
    return (
      <Card className={compact ? "!p-4" : "!p-5"}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)]">
            <Calendar className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
          <div>
            <h3 className="font-semibold">Public Booking</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Complete clinic setup to enable your public booking page.
            </p>
            <Link href={setupHref} className="mt-2 inline-block text-sm font-medium text-[var(--brand-600)] hover:underline">
              Finish setup →
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={compact ? "!p-4" : "!p-5"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-50)]">
            <Calendar className="h-5 w-5 text-[var(--brand-600)]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold">Public Booking Page</h3>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Share this link — anyone can book at {clinicName} without logging in
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-sm font-mono text-[var(--brand-700)]">
                {fullUrl}
              </code>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="shrink-0 gap-1.5"
                onClick={copyLink}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Short path: <span className="font-mono">{bookingPath}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={bookingPath} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Open Booking Page
            </Button>
          </Link>
        </div>
      </div>
      {!compact && (
        <Alert variant="info" className="mt-4 text-sm">
          Patients who book here are automatically added to your clinic&apos;s patient list with their symptoms and medical details.
        </Alert>
      )}
    </Card>
  );
}
