"use client";

import { useState, useEffect } from "react";
import { bookAppointmentAction, getAvailableSlots } from "@/lib/actions/appointments";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PatientPicker } from "@/components/patients/patient-picker";

interface Doctor {
  id: string;
  profiles?: { full_name: string; specialization: string | null };
}

interface SelectedPatient {
  id: string;
  full_name: string;
  phone: string;
  patient_code: string | null;
}

export function BookAppointmentForm({
  doctors,
  clinicId,
  patientId,
  isStaff = false,
}: {
  doctors: Doctor[];
  clinicId?: string;
  patientId?: string;
  isStaff?: boolean;
}) {
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);

  useEffect(() => {
    if (doctorId && date) {
      getAvailableSlots(doctorId, date).then(setSlots);
    } else {
      setSlots([]);
    }
  }, [doctorId, date]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    if (isStaff && selectedPatient) {
      formData.set("patientId", selectedPatient.id);
    }
    const result = await bookAppointmentAction(formData);
    if (result?.error) {
      setMessage({ text: result.error, ok: false });
    } else {
      setMessage({ text: "Appointment booked successfully!", ok: true });
      setSelectedPatient(null);
      (e.target as HTMLFormElement).reset();
      setDoctorId("");
      setDate("");
    }
    setLoading(false);
  }

  return (
    <Card className="mb-8">
      <h3 className="font-semibold mb-4">{isStaff ? "Book Appointment" : "Book New Appointment"}</h3>
      {message && (
        <Alert variant={message.ok ? "success" : "error"} className="mb-4">
          {message.text}
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        {isStaff && clinicId && (
          <div className="sm:col-span-2">
            <PatientPicker
              clinicId={clinicId}
              value={selectedPatient}
              onChange={setSelectedPatient}
            />
          </div>
        )}
        {!isStaff && patientId && <input type="hidden" name="patientId" value={patientId} />}
        <Select
          label="Doctor"
          name="doctorId"
          required
          options={[
            { value: "", label: "Select doctor..." },
            ...doctors.map((d) => ({
              value: d.id,
              label: `${d.profiles?.full_name ?? "Doctor"}${d.profiles?.specialization ? ` — ${d.profiles.specialization}` : ""}`,
            })),
          ]}
          onChange={(e) => setDoctorId(e.target.value)}
        />
        <Input label="Date" name="date" type="date" required min={new Date().toISOString().split("T")[0]} onChange={(e) => setDate(e.target.value)} />
        <Select
          label="Time Slot"
          name="time"
          required
          options={[
            { value: "", label: slots.length ? "Select slot..." : "Select doctor & date first" },
            ...slots.map((s) => ({ value: s, label: s })),
          ]}
        />
        {isStaff && (
          <Select
            label="Type"
            name="type"
            options={[
              { value: "scheduled", label: "Scheduled" },
              { value: "walk_in", label: "Walk-in" },
              { value: "emergency", label: "Emergency" },
              { value: "vip", label: "VIP" },
            ]}
          />
        )}
        <div className="sm:col-span-2">
          <Button type="submit" loading={loading} disabled={isStaff && !selectedPatient}>
            Book Appointment
          </Button>
        </div>
      </form>
    </Card>
  );
}
