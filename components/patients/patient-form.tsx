"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPatientAction } from "@/lib/actions/patients";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export function PatientForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createPatientAction(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.patientId) {
      router.push(`/receptionist/patients/${result.patientId}`);
    }
  }

  return (
    <Card>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full Name *" name="fullName" required placeholder="Raj Kumar" />
          <Input label="Phone *" name="phone" required placeholder="9876543210" />
          <Input label="Email" name="email" type="email" placeholder="raj@email.com" />
          <Input label="Date of Birth" name="dateOfBirth" type="date" />
          <Select
            label="Gender"
            name="gender"
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
            options={[
              { value: "", label: "Select..." },
              { value: "A+", label: "A+" },
              { value: "A-", label: "A-" },
              { value: "B+", label: "B+" },
              { value: "B-", label: "B-" },
              { value: "O+", label: "O+" },
              { value: "O-", label: "O-" },
              { value: "AB+", label: "AB+" },
              { value: "AB-", label: "AB-" },
            ]}
          />
        </div>
        <Input label="Address" name="address" placeholder="Full address" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Emergency Contact Name" name="emergencyContactName" />
          <Input label="Emergency Contact Phone" name="emergencyContactPhone" />
        </div>
        <Input label="Aadhaar (last 4 digits only)" name="aadhaarLastFour" maxLength={4} placeholder="1234" />
        <Textarea label="Notes" name="notes" placeholder="Any additional notes..." />
        <Button type="submit" loading={loading}>Register Patient</Button>
      </form>
    </Card>
  );
}
