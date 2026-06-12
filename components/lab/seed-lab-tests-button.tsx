"use client";

import { useTransition } from "react";
import { seedDefaultLabTests } from "@/lib/actions/lab";
import { Button } from "@/components/ui/button";

export function SeedLabTestsButton({ clinicId }: { clinicId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() => startTransition(() => { void seedDefaultLabTests(clinicId); window.location.reload(); })}
    >
      Seed Default Tests
    </Button>
  );
}
