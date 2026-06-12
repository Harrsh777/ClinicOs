"use client";

import { useTransition } from "react";
import { createInsurancePolicyAction } from "@/lib/actions/insurance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function InsurancePolicyForm({ patientId }: { patientId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <h4 className="font-medium mb-3">Add Insurance Policy</h4>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("patientId", patientId);
          startTransition(() => { void createInsurancePolicyAction(fd); });
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <Input label="Insurance Company" name="company" required placeholder="Star Health" />
        <Input label="Policy Number" name="policyNumber" required />
        <Input label="Member ID" name="memberId" />
        <Input label="Coverage %" name="coveragePercent" type="number" defaultValue="80" />
        <Input label="Expiry Date" name="expiryDate" type="date" required />
        <div className="flex items-end">
          <Button type="submit" loading={pending}>Save Policy</Button>
        </div>
      </form>
    </Card>
  );
}
