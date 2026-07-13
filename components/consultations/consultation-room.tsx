"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { saveConsultationNotesAction, endConsultationAction } from "@/lib/actions/consultations";
import { PrescriptionBuilder } from "@/components/prescriptions/prescription-builder";
import { LabOrderForm } from "@/components/lab/lab-order-form";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

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
      advice: string | null;
      follow_up_date: string | null;
    } | {
      symptoms: string | null;
      diagnosis: string | null;
      clinical_notes: string | null;
      advice: string | null;
      follow_up_date: string | null;
    }[] | null;
    appointments?: {
      notes: string | null;
      booking_symptoms: string | null;
    } | {
      notes: string | null;
      booking_symptoms: string | null;
    }[] | null;
    prescriptions?: unknown[];
  };
  allergies: { allergen: string; severity: string; reaction: string | null }[];
  labTests: { id: string; name: string; code: string; price: number }[];
  emrRecords: { visit_number: number; summary: Record<string, unknown>; created_at: string }[];
  /** Role base path for links, e.g. `/doctor` or `/owner` */
  basePath?: string;
}

function defaultFollowUpDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

export function ConsultationRoom({ consultation, allergies, labTests, emrRecords, basePath = "/doctor" }: ConsultationRoomProps) {
  const notes = Array.isArray(consultation.consultation_notes)
    ? consultation.consultation_notes[0]
    : consultation.consultation_notes;

  const appointment = Array.isArray(consultation.appointments)
    ? consultation.appointments[0]
    : consultation.appointments;

  const initialComplaint =
    notes?.symptoms?.trim() ||
    appointment?.booking_symptoms?.trim() ||
    appointment?.notes?.trim() ||
    "";

  const [symptoms, setSymptoms] = useState(initialComplaint);
  const [diagnosis, setDiagnosis] = useState(notes?.diagnosis ?? "");
  const [followUpDate, setFollowUpDate] = useState(notes?.follow_up_date ?? defaultFollowUpDate());
  const [advice, setAdvice] = useState(notes?.advice ?? "");
  const [clinicalNotes, setClinicalNotes] = useState(notes?.clinical_notes ?? "");
  const [showOptional, setShowOptional] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endResult, setEndResult] = useState<{ ok: boolean; text: string } | null>(null);

  const saveNotes = useCallback(async () => {
    if (consultation.status !== "in_progress") return;
    setSaving(true);
    const fd = new FormData();
    fd.set("consultationId", consultation.id);
    fd.set("symptoms", symptoms);
    fd.set("diagnosis", diagnosis);
    fd.set("followUpDate", followUpDate);
    fd.set("advice", advice);
    fd.set("clinicalNotes", clinicalNotes);
    await saveConsultationNotesAction(fd);
    setSaving(false);
  }, [consultation.id, consultation.status, symptoms, diagnosis, followUpDate, advice, clinicalNotes]);

  useEffect(() => {
    if (consultation.status !== "in_progress") return;
    const timer = setInterval(() => { void saveNotes(); }, 5000);
    return () => clearInterval(timer);
  }, [saveNotes, consultation.status]);

  const severeAllergies = allergies.filter((a) => a.severity === "severe");
  const canEnd = diagnosis.trim().length > 0 && followUpDate.length > 0;

  async function handleEnd() {
    if (!canEnd) {
      setEndResult({ ok: false, text: "Diagnosis and follow-up date are required." });
      return;
    }
    if (!confirm("End consultation? EMR record and bill will be created.")) return;
    setEnding(true);
    await saveNotes();
    const result = await endConsultationAction(consultation.id);
    if (result?.error) setEndResult({ ok: false, text: result.error });
    else setEndResult({ ok: true, text: `Done — Visit #${result.visitNumber}. Bill generated.` });
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

        <Card className="!p-5 border-2 border-[var(--brand-500)]/20">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-500)] mb-4">
            Quick consult — under 10 seconds
          </p>
          <div className="space-y-4">
            <Textarea
              label="Patient's problem"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="What brought the patient in today?"
              disabled={consultation.status !== "in_progress"}
              className="min-h-[60px]"
            />
            <Textarea
              label="Diagnosis *"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Ankle sprain, viral fever..."
              disabled={consultation.status !== "in_progress"}
              className="min-h-[60px]"
            />
            <Input
              label="Follow-up date *"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              disabled={consultation.status !== "in_progress"}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {consultation.status === "in_progress" && (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => void handleEnd()} loading={ending} disabled={!canEnd}>
                End Consultation
              </Button>
              <Button onClick={() => void saveNotes()} loading={saving} variant="secondary" size="sm">
                Save
              </Button>
            </div>
          )}
        </Card>

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-medium"
          onClick={() => setShowOptional(!showOptional)}
        >
          Optional: medicines, advice, notes, tests
          {showOptional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showOptional && consultation.status === "in_progress" && (
          <div className="space-y-4">
            <Card>
              <div className="space-y-4">
                <Textarea
                  label="Advice"
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  placeholder="Rest, ice, elevate..."
                  disabled={consultation.status !== "in_progress"}
                />
                <Textarea
                  label="Notes"
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Examination findings..."
                  disabled={consultation.status !== "in_progress"}
                />
              </div>
            </Card>
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
          </div>
        )}

        {endResult && (
          <Alert variant={endResult.ok ? "success" : "error"}>{endResult.text}</Alert>
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

        <Link href={`${basePath}/prescriptions?patient=${consultation.patient_id}`}>
          <Button variant="ghost" size="sm" className="w-full">View Prescriptions</Button>
        </Link>
      </div>
    </div>
  );
}
