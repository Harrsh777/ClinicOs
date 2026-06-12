"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { saveConsultationNotesAction, endConsultationAction } from "@/lib/actions/consultations";
import { PrescriptionBuilder } from "@/components/prescriptions/prescription-builder";
import { LabOrderForm } from "@/components/lab/lab-order-form";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { AIScribePanel } from "@/components/ai/ai-scribe-panel";

interface ConsultationRoomProps {
  consultation: {
    id: string;
    status: string;
    patient_id: string;
    doctor_id: string;
    patients: {
      full_name: string;
      phone: string;
      date_of_birth: string | null;
    };
    consultation_notes: {
      symptoms: string | null;
      diagnosis: string | null;
      clinical_notes: string | null;
    } | { symptoms: string | null; diagnosis: string | null; clinical_notes: string | null }[] | null;
    prescriptions?: unknown[];
  };
  allergies: { allergen: string; severity: string; reaction: string | null }[];
  labTests: { id: string; name: string; code: string; price: number }[];
  emrRecords: { visit_number: number; summary: Record<string, unknown>; created_at: string }[];
}

export function ConsultationRoom({ consultation, allergies, labTests, emrRecords }: ConsultationRoomProps) {
  const notes = Array.isArray(consultation.consultation_notes)
    ? consultation.consultation_notes[0]
    : consultation.consultation_notes;

  const [symptoms, setSymptoms] = useState(notes?.symptoms ?? "");
  const [diagnosis, setDiagnosis] = useState(notes?.diagnosis ?? "");
  const [clinicalNotes, setClinicalNotes] = useState(notes?.clinical_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [endResult, setEndResult] = useState<string | null>(null);

  const saveNotes = useCallback(async () => {
    if (consultation.status !== "in_progress") return;
    setSaving(true);
    const fd = new FormData();
    fd.set("consultationId", consultation.id);
    fd.set("symptoms", symptoms);
    fd.set("diagnosis", diagnosis);
    fd.set("clinicalNotes", clinicalNotes);
    await saveConsultationNotesAction(fd);
    setLastSaved(new Date().toLocaleTimeString());
    setSaving(false);
  }, [consultation.id, consultation.status, symptoms, diagnosis, clinicalNotes]);

  useEffect(() => {
    if (consultation.status !== "in_progress") return;
    const timer = setInterval(() => { void saveNotes(); }, 5000);
    return () => clearInterval(timer);
  }, [saveNotes, consultation.status]);

  const severeAllergies = allergies.filter((a) => a.severity === "severe");

  async function handleEnd() {
    if (!confirm("End consultation? This will create EMR record and generate a bill.")) return;
    setEnding(true);
    await saveNotes();
    const result = await endConsultationAction(consultation.id);
    if (result?.error) setEndResult(result.error);
    else setEndResult(`Consultation complete. Visit #${result.visitNumber}. Bill generated.`);
    setEnding(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {severeAllergies.length > 0 && (
          <Alert variant="error">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <strong>Allergy Alert:</strong>{" "}
              {severeAllergies.map((a) => a.allergen).join(", ")}
            </div>
          </Alert>
        )}

        {consultation.status === "in_progress" && (
          <AIScribePanel
            onApply={(draft) => {
              setSymptoms(draft.symptoms);
              setDiagnosis(draft.diagnosis);
              setClinicalNotes(draft.clinicalNotes);
            }}
          />
        )}

        <Card>
          <h3 className="font-semibold mb-4">Clinical Notes</h3>
          <div className="space-y-4">
            <Textarea label="Symptoms" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Patient complaints..." disabled={consultation.status !== "in_progress"} />
            <Textarea label="Diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Clinical diagnosis..." disabled={consultation.status !== "in_progress"} />
            <Textarea label="Clinical Notes" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Examination findings, plan..." disabled={consultation.status !== "in_progress"} />
          </div>
          {lastSaved && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {saving ? "Saving..." : `Auto-saved at ${lastSaved}`}
            </p>
          )}
        </Card>

        {consultation.status === "in_progress" && (
          <>
            <PrescriptionBuilder
              consultationId={consultation.id}
              patientId={consultation.patient_id}
              doctorId={consultation.doctor_id}
            />
            <LabOrderForm
              patientId={consultation.patient_id}
              consultationId={consultation.id}
              doctorId={consultation.doctor_id}
              tests={labTests}
            />
          </>
        )}

        {endResult && <Alert variant="success">{endResult}</Alert>}

        {consultation.status === "in_progress" && (
          <div className="flex gap-3">
            <Button onClick={() => void saveNotes()} loading={saving} variant="secondary">Save Now</Button>
            <Button onClick={() => void handleEnd()} loading={ending}>End Consultation</Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <h4 className="font-medium mb-3">Patient</h4>
          <p className="font-semibold">{consultation.patients.full_name}</p>
          <p className="text-sm text-[var(--text-muted)]">{consultation.patients.phone}</p>
          <StatusBadge status={consultation.status} />
        </Card>

        <Card>
          <h4 className="font-medium mb-3">Allergies</h4>
          {allergies.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">None recorded</p>
          ) : (
            <div className="space-y-2">
              {allergies.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{a.allergen}</span>
                  <StatusBadge status={a.severity} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h4 className="font-medium mb-3">Past Visits</h4>
          {emrRecords.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">First visit</p>
          ) : (
            <div className="space-y-2">
              {emrRecords.slice(0, 5).map((r) => (
                <div key={r.visit_number} className="text-sm">
                  <Badge variant="neutral">#{r.visit_number}</Badge>
                  <span className="ml-2 text-[var(--text-muted)]">
                    {(r.summary as { diagnosis?: string }).diagnosis ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Link href={`/doctor/prescriptions?patient=${consultation.patient_id}`}>
          <Button variant="ghost" size="sm" className="w-full">View Prescriptions</Button>
        </Link>
      </div>
    </div>
  );
}
