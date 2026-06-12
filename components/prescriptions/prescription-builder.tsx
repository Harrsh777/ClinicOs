"use client";

import { useState } from "react";
import { checkAllergyAction, createPrescriptionAction } from "@/lib/actions/prescriptions";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { PrescriptionItem } from "@/lib/types/clinical";

const FREQUENCIES = [
  { value: "Morning", label: "Morning" },
  { value: "Night", label: "Night" },
  { value: "Morning, Night", label: "Morning & Night" },
  { value: "Morning, Afternoon, Night", label: "TDS (3x daily)" },
  { value: "SOS", label: "SOS (as needed)" },
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
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Morning, Night");
  const [duration, setDuration] = useState("5 Days");
  const [instructions, setInstructions] = useState("After food");
  const [warning, setWarning] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAddMedicine() {
    if (!medicine || !dosage) return;
    setWarning(null);
    setAcknowledged(false);

    const { warnings } = await checkAllergyAction(medicine, patientId);
    if (warnings.length > 0) {
      const severe = warnings.find((w) => w.severity === "severe");
      if (severe) {
        setWarning(severe.message);
        return;
      }
      setWarning(warnings[0].message);
    }

    setItems((prev) => [
      ...prev,
      { medicine_name: medicine, dosage, frequency, duration, instructions, allergy_acknowledged: acknowledged },
    ]);
    setMedicine("");
    setDosage("");
  }

  async function handleSubmit() {
    if (!items.length) return;
    setLoading(true);
    setMessage(null);

    const fd = new FormData();
    fd.set("consultationId", consultationId);
    fd.set("patientId", patientId);
    fd.set("doctorId", doctorId);
    fd.set("items", JSON.stringify(items.map((i) => ({
      medicineName: i.medicine_name,
      dosage: i.dosage,
      frequency: i.frequency,
      duration: i.duration,
      instructions: i.instructions,
      allergyAcknowledged: i.allergy_acknowledged,
    }))));

    const result = await createPrescriptionAction(fd);
    if (result?.error) {
      if (result.allergyWarning) {
        setWarning(result.error);
      } else {
        setMessage(result.error);
      }
    } else {
      setMessage("Prescription saved successfully");
      setItems([]);
    }
    setLoading(false);
  }

  return (
    <Card>
      <h3 className="font-semibold mb-4">E-Prescription</h3>

      {warning && (
        <Alert variant="warning" className="mb-4">
          {warning}
          <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
            I acknowledge this allergy risk and wish to proceed
          </label>
        </Alert>
      )}

      {message && <Alert variant={message.includes("success") ? "success" : "error"} className="mb-4">{message}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        <Input label="Medicine" value={medicine} onChange={(e) => setMedicine(e.target.value)} placeholder="Paracetamol 500mg" />
        <Input label="Dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="1 tablet" />
        <Select label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} options={FREQUENCIES} />
        <Input label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="5 Days" />
        <Input label="Instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="After food" />
        <div className="flex items-end">
          <Button type="button" variant="secondary" onClick={() => void handleAddMedicine()}>Add Medicine</Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mb-4 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-2 border-b border-[var(--border)]">
              <span>
                <strong>{item.medicine_name}</strong> {item.dosage} — {item.frequency} — {item.duration}
              </span>
              <button type="button" className="text-[var(--danger-500)]" onClick={() => setItems((p) => p.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <Button onClick={() => void handleSubmit()} loading={loading} disabled={!items.length}>
        Save Prescription
      </Button>
    </Card>
  );
}
