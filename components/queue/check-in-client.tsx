"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { qrCheckInAction } from "@/lib/actions/queue";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Activity } from "lucide-react";

interface Clinic {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export function CheckInClient({
  clinic,
  patientId,
  isLoggedIn,
}: {
  clinic: Clinic;
  patientId: string | null;
  isLoggedIn: boolean;
}) {
  const [result, setResult] = useState<{ token_number?: number; error?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <div className="clinic-auth-card text-center">
        <Activity className="h-10 w-10 mx-auto text-[var(--brand-500)] mb-4" />
        <h1 className="text-xl font-bold">{clinic.name}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">Sign in to check in and get your token</p>
        <Link href={`/login?redirect=/check-in/${clinic.slug}`}>
          <Button className="w-full">Sign In to Check In</Button>
        </Link>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="clinic-auth-card text-center">
        <Alert variant="warning">
          Your account is not linked to a patient record at this clinic. Please contact reception.
        </Alert>
      </div>
    );
  }

  if (result?.token_number) {
    return (
      <div className="clinic-auth-card text-center">
        <p className="text-sm text-[var(--text-muted)]">You&apos;re checked in!</p>
        <p className="clinic-token-display mt-4">#{result.token_number}</p>
        <p className="text-sm text-[var(--text-muted)] mt-4">Please wait in the lobby. You&apos;ll be notified when it&apos;s your turn.</p>
        <Link href="/patient" className="mt-6 inline-block">
          <Button variant="secondary">View Live Queue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="clinic-auth-card text-center">
      <Activity className="h-10 w-10 mx-auto text-[var(--brand-500)] mb-4" />
      <h1 className="text-xl font-bold">{clinic.name}</h1>
      <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">Tap below to check in and receive your queue token</p>
      {result?.error && <Alert variant="error" className="mb-4">{result.error}</Alert>}
      <Button
        loading={pending}
        className="w-full"
        onClick={() => {
          startTransition(() => {
            void (async () => {
              const res = await qrCheckInAction(clinic.slug, patientId);
              if (res?.error) setResult({ error: res.error });
              else if (res?.token) setResult({ token_number: res.token.token_number });
            })();
          });
        }}
      >
        Check In Now
      </Button>
    </div>
  );
}
