import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Receipt } from "lucide-react";

interface BillRow {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  created_at: string;
  patients?: { full_name: string; phone: string };
}

export function BillsTable({ bills, basePath }: { bills: BillRow[]; basePath: string }) {
  if (!bills.length) {
    return <EmptyState icon={<Receipt />} title="No bills found" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {bills.map((bill) => (
          <TableRow key={bill.id}>
            <TableCell className="font-mono text-sm">{bill.invoice_number}</TableCell>
            <TableCell>{bill.patients?.full_name ?? "—"}</TableCell>
            <TableCell>₹{Number(bill.total_amount).toFixed(2)}</TableCell>
            <TableCell>₹{Number(bill.paid_amount).toFixed(2)}</TableCell>
            <TableCell><StatusBadge status={bill.status} /></TableCell>
            <TableCell className="text-sm text-[var(--text-muted)]">
              {new Date(bill.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <Link href={`${basePath}/billing/${bill.id}`}>
                <Button size="sm" variant="secondary">View</Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
