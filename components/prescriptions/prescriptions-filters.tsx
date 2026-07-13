"use client";

import { useRouter } from "next/navigation";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DoctorOption {
  id: string;
  profiles?: { full_name: string } | { full_name: string }[] | null;
}

export function PrescriptionsFilters({
  from,
  to,
  doctorId,
  status,
  doctors,
  basePath,
}: {
  from: string;
  to: string;
  doctorId?: string;
  status?: string;
  doctors: DoctorOption[];
  basePath: string;
}) {
  const router = useRouter();

  function buildUrl(fd: FormData) {
    const params = new URLSearchParams();
    const dateFrom = fd.get("from") as string;
    const dateTo = fd.get("to") as string;
    const doc = fd.get("doctor") as string;
    const st = fd.get("status") as string;
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (doc) params.set("doctor", doc);
    if (st) params.set("status", st);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const doctorOptions = [
    { value: "", label: "All doctors" },
    ...doctors.map((d) => {
      const p = d.profiles;
      const name = Array.isArray(p) ? p[0]?.full_name : p?.full_name;
      return { value: d.id, label: name ?? "Doctor" };
    }),
  ];

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "finalized", label: "Finalized" },
    { value: "dispensed", label: "Dispensed" },
    { value: "draft", label: "Draft" },
  ];

  return (
    <form
      className="flex flex-wrap gap-3 items-end mb-6"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(buildUrl(new FormData(e.currentTarget)));
      }}
    >
      <Input label="From" name="from" type="date" defaultValue={from} className="max-w-[160px]" />
      <Input label="To" name="to" type="date" defaultValue={to} className="max-w-[160px]" />
      <Select
        label="Doctor"
        name="doctor"
        defaultValue={doctorId ?? ""}
        options={doctorOptions}
        className="max-w-[180px]"
      />
      <Select
        label="Status"
        name="status"
        defaultValue={status ?? ""}
        options={statusOptions}
        className="max-w-[160px]"
      />
      <Button type="submit" variant="secondary" size="sm">
        Apply
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const end = new Date();
          const start = new Date();
          start.setDate(start.getDate() - 30);
          router.push(
            `${basePath}?from=${start.toISOString().split("T")[0]}&to=${end.toISOString().split("T")[0]}`
          );
        }}
      >
        Last 30 days
      </Button>
    </form>
  );
}
