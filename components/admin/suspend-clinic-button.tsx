"use client";

import { useTransition } from "react";
import { suspendClinicAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function SuspendClinicButton({ clinicId, suspended }: { clinicId: string; suspended: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={suspended ? "secondary" : "danger"}
      loading={pending}
      onClick={() =>
        startTransition(() => {
          void suspendClinicAction(clinicId, !suspended);
        })
      }
    >
      {suspended ? "Reactivate" : "Suspend"}
    </Button>
  );
}
