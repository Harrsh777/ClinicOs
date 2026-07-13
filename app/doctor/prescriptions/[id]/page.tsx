import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getPrescription } from "@/lib/actions/prescriptions";
import { PageHeader, Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { PrescriptionSharePanel } from "@/components/prescriptions/prescription-share-panel";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default async function DoctorPrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["doctor"]);
  const { id } = await params;
  const rx = await getPrescription(id);
  if (!rx) notFound();

  const patient = rx.patients as {
    full_name: string;
    phone: string;
    email?: string | null;
  };
  const doctor = rx.doctors as { profiles: { full_name: string; specialization: string | null } };
  const items = (rx.prescription_items ?? []) as {
    id: string;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
    allergy_acknowledged: boolean;
    sort_order: number;
  }[];

  items.sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Prescription — ${patient.full_name}`}
        subtitle={new Date(rx.created_at).toLocaleString()}
        backHref="/doctor/prescriptions"
        backLabel="All prescriptions"
        action={
          <Link href={`/print/prescription/${id}`} target="_blank">
            <Button variant="secondary">Print / PDF</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Medicines</h3>
            <StatusBadge status={rx.status ?? "finalized"} />
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={item.id} className="rounded-xl border border-[var(--border)] p-4">
                <p className="font-semibold">
                  {i + 1}. {item.medicine_name}
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {item.dosage} · {item.frequency} · {item.duration}
                </p>
                {item.instructions && (
                  <p className="text-sm text-[var(--text-muted)] mt-1">{item.instructions}</p>
                )}
                {item.allergy_acknowledged && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-2">
                    <AlertTriangle className="h-3 w-3" />
                    Allergy acknowledged
                  </span>
                )}
              </div>
            ))}
          </div>
          {rx.notes && (
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <h4 className="text-sm font-medium mb-1">Clinical advice</h4>
              <p className="text-sm text-[var(--text-secondary)]">{rx.notes}</p>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold mb-2">Prescribed by</h3>
            <p className="text-sm">Dr. {doctor.profiles.full_name}</p>
            {doctor.profiles.specialization && (
              <p className="text-sm text-[var(--text-muted)]">{doctor.profiles.specialization}</p>
            )}
            <Link
              href={`/doctor/consultations/${rx.consultation_id}`}
              className="inline-block text-sm text-[var(--brand-600)] hover:underline mt-3"
            >
              View consultation →
            </Link>
          </Card>

          <PrescriptionSharePanel
            prescriptionId={id}
            patientName={patient.full_name}
            patientPhone={patient.phone}
            patientEmail={patient.email}
            sharedAt={rx.shared_at}
          />
        </div>
      </div>
    </div>
  );
}
