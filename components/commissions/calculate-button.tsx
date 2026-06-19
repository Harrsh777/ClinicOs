"use client";

import { useState } from "react";
import { calculateMonthlyCommissions } from "@/lib/actions/commissions";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function CalculateCommissionsButton({ clinicId, month }: { clinicId: string; month: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCalculate() {
    setLoading(true);
    const result = await calculateMonthlyCommissions(clinicId, month);
    if (result && typeof result === "object" && "error" in result) {
      alert(result.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => void handleCalculate()} loading={loading} className="gap-2">
      <RefreshCw className="h-4 w-4" />
      Calculate This Month
    </Button>
  );
}
