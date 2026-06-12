"use client";

import { useState, useEffect } from "react";
import { bookAppointmentAction, getAvailableSlots } from "@/lib/actions/appointments";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

interface Doctor {
  id: string;
  profiles?: { full_name: string; specialization: string | null };
}

interface Patient {
  id: string;
  full_name: string;
}

export function BookAppointmentForm({
  doctors,
  patients,
  patientId,
  isStaff = false,
}: {
  doctors: Doctor[];
  patients?: Patient[];
  patientId?: string;
  isStaff?: boolean;
}) {
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    const result = await bookAppointmentAction(new FormData(e.currentTarget));
    setMessage(result?.error ?? "Appointment booked successfully!");
    setLoading(false);
  }

  return (
    <Card>
      <h3 className="font-semibold mb-4">{isStaff ? "Book Appointment" : "Book New Appointment"}</h3>
      {message && (
        <Alert variant={message.includes("success") ? "success" : "error"} className="mb-4">
          {message}
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        {isStaff && patients && (
          <Select
            label="Patient"
            name="patientId"
            required
            options={[
              { value: "", label: "Select patient..." },
              ...patients.map((p) => ({ value: p.id, label: p.full_name })),
            ]}
          />
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
          <Button type="submit" loading={loading}>Book Appointment</Button>
        </div>
      </form>
    </Card>
  );
}
