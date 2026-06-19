"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPatientDocumentAction } from "@/lib/actions/patients";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export function DocumentUploadForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    formData.set("patientId", patientId);
    const result = await uploadPatientDocumentAction(formData);
    if (result?.error) {
      setMessage({ text: result.error, ok: false });
    } else {
      setMessage({ text: "Document uploaded", ok: true });
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card className="mb-4">
      <h4 className="font-medium mb-4">Upload Document</h4>
      {message && (
        <Alert variant={message.ok ? "success" : "error"} className="mb-4">
          {message.text}
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <Input label="Document Name" name="name" placeholder="Lab report, X-ray..." />
        <Select
          label="Type"
          name="documentType"
          options={[
            { value: "lab_report", label: "Lab Report" },
            { value: "prescription", label: "Prescription" },
            { value: "imaging", label: "Imaging" },
            { value: "insurance", label: "Insurance" },
            { value: "other", label: "Other" },
          ]}
        />
        <Input label="File" name="file" type="file" required accept=".pdf,image/*" className="sm:col-span-2" />
        <Button type="submit" loading={loading}>Upload</Button>
      </form>
    </Card>
  );
}
