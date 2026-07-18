"use client";

import Link from "next/link";
import {
  getPublicAppOrigin,
  getPublicBookingPath,
  getPublicBookingUrl,
  getPublicPortalPath,
} from "@/lib/portal/public-urls";

interface QRCodeDisplayProps {
  clinicSlug: string;
  clinicName: string;
  appOrigin?: string;
}

export function QRCodeDisplay({ clinicSlug, clinicName, appOrigin }: QRCodeDisplayProps) {
  const resolvedOrigin =
    appOrigin ||
    getPublicAppOrigin() ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const portalUrl = resolvedOrigin
    ? `${resolvedOrigin}${getPublicPortalPath(clinicSlug)}`
    : getPublicPortalPath(clinicSlug);
  const bookingUrl = getPublicBookingUrl(clinicSlug, resolvedOrigin);
  const checkInUrl = resolvedOrigin
    ? `${resolvedOrigin}/c/${clinicSlug}/check-in`
    : `/c/${clinicSlug}/check-in`;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm font-medium mb-1">Public Booking</p>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Share this link — patients can book online without an account
        </p>
        <div className="inline-block p-4 bg-white rounded-[var(--radius-lg)] border border-[var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingUrl)}`}
            alt={`QR code for ${clinicName} online booking`}
            width={200}
            height={200}
            className="mx-auto"
          />
        </div>
        <p className="mt-3 text-xs font-mono break-all text-[var(--brand-600)]">{getPublicBookingPath(clinicSlug)}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href={getPublicBookingPath(clinicSlug)} target="_blank" className="clinic-btn clinic-btn-primary clinic-btn-sm inline-flex">
            Open Booking Page
          </Link>
          <Link href={getPublicPortalPath(clinicSlug)} target="_blank" className="clinic-btn clinic-btn-secondary clinic-btn-sm inline-flex">
            Open Portal
          </Link>
        </div>
      </div>

      <div className="text-center border-t border-[var(--border)] pt-6">
        <p className="text-sm font-medium mb-1">Walk-in Queue</p>
        <p className="text-xs text-[var(--text-muted)] mb-3">For same-day walk-in tokens</p>
        <Link href={`/c/${clinicSlug}/walk-in`} target="_blank" className="clinic-btn clinic-btn-secondary clinic-btn-sm inline-flex">
          Walk-in Queue
        </Link>
      </div>

      <div className="text-center border-t border-[var(--border)] pt-6">
        <p className="text-sm font-medium mb-1">QR Check-in</p>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          For same-day check-in with booking ID
        </p>
        <p className="text-xs font-mono break-all">/c/{clinicSlug}/check-in</p>
        <Link href={`/c/${clinicSlug}/check-in`} target="_blank" className="clinic-btn clinic-btn-ghost clinic-btn-sm mt-3 inline-flex">
          Open Check-in
        </Link>
      </div>

      <div className="text-center border-t border-[var(--border)] pt-6">
        <Link
          href={`/queue/${clinicSlug}/display`}
          target="_blank"
          rel="noopener noreferrer"
          className="clinic-btn clinic-btn-secondary clinic-btn-sm inline-flex"
        >
          Open TV Display
        </Link>
      </div>
    </div>
  );
}
