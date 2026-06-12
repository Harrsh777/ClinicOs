import Link from "next/link";
import { Activity } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-1)] px-6">
      <div className="text-center max-w-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-500)] text-white mx-auto mb-6">
          <Activity className="h-7 w-7" />
        </div>
        <h1 className="text-6xl font-bold text-[var(--text-primary)]">404</h1>
        <p className="mt-2 text-lg text-[var(--text-secondary)]">Page not found</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="clinic-btn clinic-btn-secondary">Go Home</Link>
          <Link href="/login" className="clinic-btn clinic-btn-primary">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
