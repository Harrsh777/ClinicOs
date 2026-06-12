"use client";

import { useTransition } from "react";
import { updateClaimStatusAction } from "@/lib/actions/insurance";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Claim {
  id: string;
  claim_amount: number;
  approved_amount: number | null;
  status: string;
  created_at: string;
  patients?: { full_name: string };
  insurance_policies?: { company: string; policy_number: string };
  bills?: { invoice_number: string };
}

const NEXT_STATUS: Record<string, string> = {
  draft: "submitted",
  submitted: "processing",
  processing: "approved",
};

export function InsuranceClaimsTable({ claims }: { claims: Claim[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>Policy</TableHead>
          <TableHead>Bill</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {claims.map((claim) => (
          <TableRow key={claim.id}>
            <TableCell>{claim.patients?.full_name}</TableCell>
            <TableCell>{claim.insurance_policies?.company}</TableCell>
            <TableCell className="font-mono text-sm">{claim.bills?.invoice_number ?? "—"}</TableCell>
            <TableCell>₹{Number(claim.claim_amount).toFixed(2)}</TableCell>
            <TableCell><StatusBadge status={claim.status} /></TableCell>
            <TableCell>
              {NEXT_STATUS[claim.status] && (
                <Button
                  size="sm"
                  loading={pending}
                  onClick={() =>
                    startTransition(() => {
                      void updateClaimStatusAction(claim.id, NEXT_STATUS[claim.status], Number(claim.claim_amount));
                    })
                  }
                >
                  → {NEXT_STATUS[claim.status]}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
