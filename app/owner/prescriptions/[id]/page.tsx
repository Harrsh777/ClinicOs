import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  getPrescription,
  getPrescriptionDispenseStatus,
} from "@/lib/actions/prescriptions";
import { PageHeader, Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { PrescriptionSharePanel } from "@/components/prescriptions/prescription-share-panel";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default async function OwnerPrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["clinic_owner"]);
  const { id } = await params;

  const [rx, dispense] = await Promise.all([
    getPrescription(id),
    getPrescriptionDispenseStatus(id),
  ]);

  if (!rx) notFound();

  const patient = rx.patients as {
    full_name: string;
    phone: string;
    date_of_birth: string | null;
    email?: string | null;
  };
  const doctor = rx.doctors as { profiles: { full_name: string; specialization: string | null } };
  const clinic = (
    rx.consultations as {
      id: string;
      clinics: {
        name: string;
        address: string | null;
        phone: string | null;
        prescription_header: string | null;
      };
    }
  )?.clinics;
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

  const dispensedIds = dispense.dispensedIds ?? new Set<string>();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Prescription — ${patient.full_name}`}
        subtitle={new Date(rx.created_at).toLocaleString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
        backHref="/owner/prescriptions"
        backLabel="All prescriptions"
        action={
          <Link href={`/print/prescription/${id}`} target="_blank">
            <Button variant="secondary">Print / PDF</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-lg">Medicines</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Dr. {doctor.profiles.full_name}
                  {doctor.profiles.specialization ? ` · ${doctor.profiles.specialization}` : ""}
                </p>
              </div>
              <StatusBadge status={rx.status ?? "finalized"} />
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-1)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {i + 1}. {item.medicine_name}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {item.dosage} · {item.frequency} · {item.duration}
                      </p>
                      {item.instructions && (
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                          {item.instructions}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {item.allergy_acknowledged && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Allergy acknowledged
                        </span>
                      )}
                      {dispensedIds.has(item.id) ? (
                        <span className="text-xs text-emerald-600 font-medium">Dispensed</span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">Not dispensed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {rx.notes && (
              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <h4 className="text-sm font-medium mb-1">Clinical advice & notes</h4>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{rx.notes}</p>
              </div>
            )}
          </Card>

          {dispense.total > 0 && (
            <Card className="!p-4">
              <p className="text-sm">
                <span className="font-medium">Pharmacy:</span>{" "}
                {dispense.dispensed} of {dispense.total} medicines dispensed
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold mb-3">Patient</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">Name</dt>
                <dd>
                  <Link
                    href={`/owner/patients/${rx.patient_id}`}
                    className="font-medium hover:text-[var(--brand-600)]"
                  >
                    {patient.full_name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Phone</dt>
                <dd>{patient.phone}</dd>
              </div>
              {patient.email && (
                <div>
                  <dt className="text-[var(--text-muted)]">Email</dt>
                  <dd>{patient.email}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <h3 className="font-semibold mb-3">Clinic</h3>
            <p className="text-sm font-medium">{clinic?.name}</p>
            {clinic?.address && (
              <p className="text-sm text-[var(--text-muted)]">{clinic.address}</p>
            )}
            {clinic?.prescription_header && (
              <p className="text-xs text-[var(--text-muted)] mt-2">{clinic.prescription_header}</p>
            )}
            <Link
              href={`/owner/consultations/${rx.consultation_id}`}
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
