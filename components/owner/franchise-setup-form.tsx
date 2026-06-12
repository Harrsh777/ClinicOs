"use client";

import { useState } from "react";
import { createFranchiseGroupAction, linkBranchToFranchiseAction } from "@/lib/actions/franchise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function FranchiseSetupForm({ mode }: { mode: "create" | "link" }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await createFranchiseGroupAction(fd);
    setMessage(res?.error ?? "Franchise group created!");
    setLoading(false);
    if (!res?.error) router.refresh();
  }

  async function handleLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await linkBranchToFranchiseAction(fd);
    setMessage(res?.error ?? "Branch linked successfully!");
    setLoading(false);
    if (!res?.error) router.refresh();
  }

  if (mode === "create") {
    return (
      <Card>
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <Input name="name" label="Franchise Group Name" placeholder="City Clinic Chain" required />
          {message && <p className="text-sm text-[var(--text-secondary)]">{message}</p>}
          <Button type="submit" loading={loading}>Create Franchise Group</Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="!p-4">
      <form onSubmit={(e) => void handleLink(e)} className="flex flex-wrap gap-3 items-end">
        <Input name="clinicSlug" label="Branch Clinic Slug" placeholder="city-clinic-branch-2" required className="min-w-[200px]" />
        <Input name="branchLabel" label="Branch Label" placeholder="Clinic Branch 2" required className="min-w-[160px]" />
        <Button type="submit" loading={loading} size="sm">Link Branch</Button>
      </form>
      {message && <p className="text-xs text-[var(--text-muted)] mt-2">{message}</p>}
    </Card>
  );
}
