"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AppointmentsDateFilter({
  from,
  to,
  basePath,
}: {
  from: string;
  to: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <form
      className="flex flex-wrap gap-3 items-end mb-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const dateFrom = fd.get("from") as string;
        const dateTo = fd.get("to") as string;
        router.push(`${basePath}?from=${dateFrom}&to=${dateTo}`);
      }}
    >
      <Input label="From" name="from" type="date" defaultValue={from} className="max-w-[160px]" />
      <Input label="To" name="to" type="date" defaultValue={to} className="max-w-[160px]" />
      <Button type="submit" variant="secondary" size="sm">Apply</Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const today = new Date().toISOString().split("T")[0];
          const end = new Date();
          end.setDate(end.getDate() + 30);
          router.push(`${basePath}?from=${today}&to=${end.toISOString().split("T")[0]}`);
        }}
      >
        Next 30 days
      </Button>
    </form>
  );
}
