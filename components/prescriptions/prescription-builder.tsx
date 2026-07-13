"use client";

import { useState } from "react";
import Link from "next/link";
import { checkAllergyAction, createPrescriptionAction } from "@/lib/actions/prescriptions";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { PrescriptionItem } from "@/lib/types/clinical";
import { AlertTriangle, Plus, Trash2, ExternalLink } from "lucide-react";

const FREQUENCIES = [
  { value: "Morning", label: "Morning (OD)" },
  { value: "Night", label: "Night (HS)" },
  { value: "Morning, Night", label: "Morning & Night (BD)" },
  { value: "Morning, Afternoon, Night", label: "TDS (3× daily)" },
  { value: "Every 6 hours", label: "Every 6 hours (Q6H)" },
  { value: "SOS", label: "SOS (as needed)" },
];

const DURATIONS = [
  { value: "3 Days", label: "3 Days" },
  { value: "5 Days", label: "5 Days" },
  { value: "7 Days", label: "7 Days" },
  { value: "10 Days", label: "10 Days" },
  { value: "14 Days", label: "14 Days" },
  { value: "1 Month", label: "1 Month" },
];

const INSTRUCTIONS = [
  { value: "After food", label: "After food" },
  { value: "Before food", label: "Before food" },
  { value: "Empty stomach", label: "Empty stomach" },
  { value: "At bedtime", label: "At bedtime" },
  { value: "With plenty of water", label: "With plenty of water" },
];

export function PrescriptionBuilder({
  consultationId,
  patientId,
  doctorId,
}: {
  consultationId: string;
  patientId: string;
  doctorId: string;
}) {
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("1 tablet");
  const [frequency, setFrequency] = useState("Morning, Night");
  const [duration, setDuration] = useState("5 Days");
  const [instructions, setInstructions] = useState("After food");
  const [notes, setNotes] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const isDuplicate = items.some(
    (i) => i.medicine_name.trim().toLowerCase() === medicine.trim().toLowerCase()
  );

  async function handleAddMedicine() {
    if (!medicine.trim() || !dosage.trim()) return;
    if (isDuplicate) {
      setWarning("This medicine is already in the prescription.");
      return;
    }
    setWarning(null);
    setAcknowledged(false);

    const { warnings } = await checkAllergyAction(medicine, patientId);
    if (warnings.length > 0) {
      const severe = warnings.find((w) => w.severity === "severe");
      if (severe && !acknowledged) {
        setWarning(severe.message);
        return;
      }
      if (!severe) setWarning(warnings[0].message);
    }

    setItems((prev) => [
      ...prev,
      {
        medicine_name: medicine.trim(),
        dosage,
        frequency,
        duration,
        instructions,
        allergy_acknowledged: acknowledged || warnings.length > 0,
      },
    ]);
    setMedicine("");
    setDosage("1 tablet");
    setWarning(null);
    setAcknowledged(false);
  }

  async function handleSubmit() {
    if (!items.length) return;
    setLoading(true);
    setMessage(null);
    setSavedId(null);

    const fd = new FormData();
    fd.set("consultationId", consultationId);
    fd.set("patientId", patientId);
    fd.set("doctorId", doctorId);
    fd.set("notes", notes);
    fd.set(
      "items",
      JSON.stringify(
        items.map((i) => ({
          medicineName: i.medicine_name,
          dosage: i.dosage,
          frequency: i.frequency,
          duration: i.duration,
          instructions: i.instructions,
          allergyAcknowledged: i.allergy_acknowledged,
        }))
      )
    );

    const result = await createPrescriptionAction(fd);
    if (result?.error) {
      if (result.allergyWarning) {
        setWarning(result.error);
      } else {
        setMessage(result.error);
      }
    } else {
      setMessage("Prescription saved successfully");
      setSavedId(result.prescriptionId ?? null);
      setItems([]);
      setNotes("");
    }
    setLoading(false);
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">E-Prescription</h3>
        <span className="text-xs text-[var(--text-muted)]">{items.length} medicine{items.length === 1 ? "" : "s"}</span>
      </div>

      {warning && (
        <Alert variant="warning" className="mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              {warning}
              {warning.includes("Allergy") && (
                <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />
                  I acknowledge this allergy risk and wish to proceed
                </label>
              )}
            </div>
          </div>
        </Alert>
      )}

      {message && (
        <Alert variant={message.includes("success") ? "success" : "error"} className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{message}</span>
            {savedId && (
              <Link
                href={`/print/prescription/${savedId}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-sm font-medium underline"
              >
                Print <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        <Input
          label="Medicine"
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          placeholder="Paracetamol 500mg"
        />
        <Input
          label="Dosage"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          placeholder="1 tablet"
        />
        <Select
          label="Frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          options={FREQUENCIES}
        />
        <Select
          label="Duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          options={DURATIONS}
        />
        <Select
          label="Instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          options={INSTRUCTIONS}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleAddMedicine()}
            disabled={!medicine.trim() || isDuplicate}
            className="gap-1.5 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add medicine
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mb-4 rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between items-start gap-3 p-3 text-sm">
              <div>
                <p className="font-medium">{item.medicine_name}</p>
                <p className="text-[var(--text-muted)]">
                  {item.dosage} · {item.frequency} · {item.duration}
                  {item.instructions ? ` · ${item.instructions}` : ""}
                </p>
                {item.allergy_acknowledged && (
                  <span className="text-xs text-amber-600">Allergy acknowledged</span>
                )}
              </div>
              <button
                type="button"
                className="text-[var(--danger-500)] p-1 hover:bg-[var(--surface-2)] rounded"
                onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
                aria-label="Remove medicine"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Textarea
        label="Clinical advice & follow-up notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Rest, hydration, follow-up in 1 week, recommended tests…"
        rows={2}
        className="mb-4"
      />

      <Button onClick={() => void handleSubmit()} loading={loading} disabled={!items.length}>
        Save prescription
      </Button>
    </Card>
  );
}
