import { StatCard } from "@/components/ui/card";
import { Pill, Calendar, Share2, Package } from "lucide-react";
import type { PrescriptionStatus } from "@/lib/actions/prescriptions";

interface PrescriptionRow {
  created_at: string;
  status?: PrescriptionStatus | string;
  shared_at?: string | null;
  prescription_items?: unknown[];
}

export function PrescriptionsStats({ prescriptions }: { prescriptions: PrescriptionRow[] }) {
  const today = new Date().toISOString().split("T")[0];
  const todayRx = prescriptions.filter((rx) => rx.created_at.startsWith(today));
  const shared = prescriptions.filter((rx) => rx.shared_at);
  const dispensed = prescriptions.filter((rx) => rx.status === "dispensed");
  const totalMeds = prescriptions.reduce(
    (sum, rx) => sum + (Array.isArray(rx.prescription_items) ? rx.prescription_items.length : 0),
    0
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      <StatCard
        label="Today"
        value={todayRx.length}
        icon={<Calendar className="h-5 w-5 text-[var(--brand-500)]" />}
        accent="#14B8A6"
      />
      <StatCard
        label="In range"
        value={prescriptions.length}
        icon={<Pill className="h-5 w-5 text-violet-500" />}
        accent="#8B5CF6"
      />
      <StatCard
        label="Shared with patients"
        value={shared.length}
        icon={<Share2 className="h-5 w-5 text-sky-500" />}
        accent="#0EA5E9"
      />
      <StatCard
        label="Medicines prescribed"
        value={totalMeds}
        icon={<Package className="h-5 w-5 text-amber-500" />}
        accent="#F59E0B"
        trend={dispensed.length > 0 ? `${dispensed.length} fully dispensed` : undefined}
      />
    </div>
  );
}
