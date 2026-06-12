"use client";

interface QRCodeDisplayProps {
  clinicSlug: string;
  clinicName: string;
}

export function QRCodeDisplay({ clinicSlug, clinicName }: QRCodeDisplayProps) {
  const checkInUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/check-in/${clinicSlug}`
      : `/check-in/${clinicSlug}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    typeof window !== "undefined" ? `${window.location.origin}/check-in/${clinicSlug}` : `https://your-domain.com/check-in/${clinicSlug}`
  )}`;

  return (
    <div className="text-center">
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Patients scan this QR code to check in at {clinicName}
      </p>
      <div className="inline-block p-4 bg-white rounded-[var(--radius-lg)] border border-[var(--border)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`/check-in/${clinicSlug}`)}`}
          alt={`QR code for ${clinicName} check-in`}
          width={200}
          height={200}
          className="mx-auto"
        />
      </div>
      <p className="mt-4 text-xs text-[var(--text-muted)] font-mono break-all">
        /check-in/{clinicSlug}
      </p>
      <a
        href={`/queue/${clinicSlug}/display`}
        target="_blank"
        rel="noopener noreferrer"
        className="clinic-btn clinic-btn-secondary clinic-btn-sm mt-4 inline-flex"
      >
        Open TV Display
      </a>
    </div>
  );
}
