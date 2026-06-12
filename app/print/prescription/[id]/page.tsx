import { getPrescription } from "@/lib/actions/prescriptions";
import { notFound } from "next/navigation";
import { PrintPrescription } from "@/components/print/print-prescription";

export default async function PrintPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rx = await getPrescription(id);
  if (!rx) notFound();

  return <PrintPrescription prescription={rx} />;
}
