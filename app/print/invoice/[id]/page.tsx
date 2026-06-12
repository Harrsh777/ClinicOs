import { getBill } from "@/lib/actions/billing";
import { notFound } from "next/navigation";
import { PrintInvoice } from "@/components/print/print-invoice";

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bill = await getBill(id);
  if (!bill) notFound();

  return <PrintInvoice bill={bill} />;
}
