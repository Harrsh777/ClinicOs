"use client";

import { useTransition } from "react";
import { deactivateStaffAction } from "@/lib/actions/owner";
import { Button } from "@/components/ui/button";

export function DeactivateStaffButton({ staffId, name }: { staffId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="danger"
      loading={pending}
      onClick={() => {
        if (confirm(`Deactivate ${name}?`)) {
          startTransition(() => { void deactivateStaffAction(staffId); });
        }
      }}
    >
      Deactivate
    </Button>
  );
}
