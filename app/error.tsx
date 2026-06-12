"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-1)] px-6">
      <div className="text-center max-w-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--danger-50)] text-[var(--danger-500)] mx-auto mb-6">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          An unexpected error occurred. Please try again or contact support.
        </p>
        <button onClick={reset} className="clinic-btn clinic-btn-primary mt-8">
          Try Again
        </button>
      </div>
    </div>
  );
}
