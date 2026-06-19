"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePatientAction } from "@/lib/actions/patients";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import type { Patient } from "@/lib/types/database";

export function PatientEditForm({ patient, basePath }: { patient: Patient; basePath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("patientId", patient.id);
    const result = await updatePatientAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setEditing(false);
      router.refresh();
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
        Edit Patient
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <h4 className="font-medium mb-4">Edit Patient</h4>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full Name *" name="fullName" required defaultValue={patient.full_name} />
          <Input label="Phone *" name="phone" required defaultValue={patient.phone} />
          <Input label="Email" name="email" type="email" defaultValue={patient.email ?? ""} />
          <Input label="Date of Birth" name="dateOfBirth" type="date" defaultValue={patient.date_of_birth ?? ""} />
          <Select
            label="Gender"
            name="gender"
            defaultValue={patient.gender ?? ""}
            options={[
              { value: "", label: "Select..." },
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
          />
          <Select
            label="Blood Group"
            name="bloodGroup"
            defaultValue={patient.blood_group ?? ""}
            options={[
              { value: "", label: "Select..." },
              { value: "A+", label: "A+" },
              { value: "A-", label: "A-" },
              { value: "B+", label: "B+" },
              { value: "B-", label: "B-" },
              { value: "AB+", label: "AB+" },
              { value: "AB-", label: "AB-" },
              { value: "O+", label: "O+" },
              { value: "O-", label: "O-" },
            ]}
          />
          <Input label="Emergency Contact" name="emergencyContactName" defaultValue={patient.emergency_contact_name ?? ""} />
          <Input label="Emergency Phone" name="emergencyContactPhone" defaultValue={patient.emergency_contact_phone ?? ""} />
          <Input label="Aadhaar (last 4)" name="aadhaarLastFour" maxLength={4} defaultValue={patient.aadhaar_last_four ?? ""} />
        </div>
        <Textarea label="Address" name="address" defaultValue={patient.address ?? ""} rows={2} />
        <Textarea label="Notes" name="notes" defaultValue={patient.notes ?? ""} rows={2} />
        <div className="flex gap-2">
          <Button type="submit" loading={loading}>Save Changes</Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
