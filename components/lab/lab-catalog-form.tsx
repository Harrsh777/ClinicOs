"use client";

import { useTransition } from "react";
import { createLabTestAction } from "@/lib/actions/lab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LabCatalogForm() {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <h3 className="font-semibold mb-4">Add Lab Test</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(() => { void createLabTestAction(new FormData(e.currentTarget)); });
        }}
        className="space-y-3"
      >
        <Input label="Test Name" name="name" required placeholder="Complete Blood Count" />
        <Input label="Code" name="code" required placeholder="CBC" />
        <Input label="Price (₹)" name="price" type="number" required />
        <Input label="Description" name="description" />
        <Button type="submit" loading={pending}>Add Test</Button>
      </form>
    </Card>
  );
}
