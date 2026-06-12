"use client";

import { useState } from "react";
import { VitalsForm } from "@/components/patients/vitals-form";
import { VitalsChart } from "@/components/patients/vitals-chart";
import { AllergyForm } from "@/components/patients/allergy-form";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { EmrTimeline } from "@/components/patients/emr-timeline";
import { InsurancePolicyForm } from "@/components/insurance/policy-form";
import type { Patient, PatientVitals, PatientAllergy } from "@/lib/types/database";
import type { EmrRecord } from "@/lib/types/clinical";
import { Activity } from "lucide-react";

const TABS = ["Overview", "Vitals", "Allergies", "History", "Visits", "Documents"] as const;

interface Props {
  patient: Patient;
  vitals: PatientVitals[];
  allergies: PatientAllergy[];
  history: Record<string, string | null> | null;
  documents: { id: string; name: string; document_type: string; created_at: string }[];
  emrRecords?: EmrRecord[];
  canEdit?: boolean;
  showInsurance?: boolean;
}

export function PatientProfileTabs({ patient, vitals, allergies, history, documents, emrRecords = [], canEdit, showInsurance }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  return (
    <div>
      <div className="clinic-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`clinic-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h4 className="font-medium mb-3">Personal Details</h4>
            <dl className="space-y-2 text-sm">
              {[
                ["Email", patient.email],
                ["DOB", patient.date_of_birth],
                ["Gender", patient.gender],
                ["Blood Group", patient.blood_group],
                ["Address", patient.address],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">{k}</dt>
                  <dd>{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <h4 className="font-medium mb-3">Emergency Contact</h4>
            <p className="text-sm">{patient.emergency_contact_name ?? "—"}</p>
            <p className="text-sm text-[var(--text-muted)]">{patient.emergency_contact_phone ?? ""}</p>
          </Card>
        </div>
      )}

      {tab === "Vitals" && (
        <div className="space-y-6">
          {vitals.length >= 2 && <VitalsChart vitals={vitals} />}
          {canEdit && <VitalsForm patientId={patient.id} />}
          <div className="space-y-2">
            {[...vitals].reverse().map((v) => (
              <Card key={v.id} padding className="!p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">
                    {new Date(v.recorded_at).toLocaleString()}
                  </span>
                  <div className="flex gap-3">
                    {v.weight_kg && <span>W: {v.weight_kg}kg</span>}
                    {v.bp_systolic && <span>BP: {v.bp_systolic}/{v.bp_diastolic}</span>}
                    {v.bmi && <span>BMI: {v.bmi}</span>}
                    {v.pulse && <span>Pulse: {v.pulse}</span>}
                  </div>
                </div>
              </Card>
            ))}
            {!vitals.length && <EmptyState icon={<Activity />} title="No vitals recorded" />}
          </div>
        </div>
      )}

      {tab === "Allergies" && (
        <div className="space-y-4">
          {canEdit && <AllergyForm patientId={patient.id} />}
          {allergies.map((a) => (
            <Card key={a.id} padding className="!p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{a.allergen}</p>
                {a.reaction && <p className="text-sm text-[var(--text-muted)]">{a.reaction}</p>}
              </div>
              <StatusBadge status={a.severity} />
            </Card>
          ))}
          {!allergies.length && <EmptyState title="No allergies recorded" />}
        </div>
      )}

      {tab === "History" && (
        <Card>
          {history ? (
            <dl className="space-y-3 text-sm">
              {Object.entries(history).filter(([k]) => !["id", "patient_id", "clinic_id", "created_at", "updated_at", "updated_by"].includes(k)).map(([k, v]) => (
                <div key={k}>
                  <dt className="font-medium capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="text-[var(--text-secondary)] mt-0.5">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState title="No medical history recorded" />
          )}
        </Card>
      )}

      {tab === "Visits" && <EmrTimeline records={emrRecords} />}

      {showInsurance && canEdit && (
        <div className="mb-6">
          <InsurancePolicyForm patientId={patient.id} />
        </div>
      )}

      {tab === "Documents" && (
        <div className="space-y-2">
          {documents.map((d) => (
            <Card key={d.id} padding className="!p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{new Date(d.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant="info">{d.document_type}</Badge>
            </Card>
          ))}
          {!documents.length && <EmptyState title="No documents uploaded" />}
        </div>
      )}
    </div>
  );
}
