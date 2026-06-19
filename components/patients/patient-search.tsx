"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function PatientSearch({
  defaultValue,
  basePath = "/receptionist/patients",
}: {
  defaultValue?: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q") as string;
        router.push(`${basePath}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      }}
      className="relative max-w-md"
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Search by name or phone..."
        className="clinic-input pl-9"
      />
    </form>
  );
}
