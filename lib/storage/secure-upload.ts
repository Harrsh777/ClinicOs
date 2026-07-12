import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const MAX_BYTES = 5 * 1024 * 1024;

export type SecureUploadResult =
  | { ok: true; path: string; documentId?: string }
  | { ok: false; error: string };

/**
 * Tenant-isolated file upload to clinical-documents bucket.
 * Path: {clinicId}/patients/{patientId}/{filename}
 * Virus-scan hook: set metadata.scan_status = 'pending' for future ClamAV integration.
 */
export async function secureTenantUpload(params: {
  clinicId: string;
  patientId: string;
  file: File;
  uploadedBy?: string;
  documentType?: "report" | "other";
}): Promise<SecureUploadResult> {
  if (!ALLOWED_MIME.has(params.file.type)) {
    return { ok: false, error: "Only PDF, JPG, and PNG files are allowed" };
  }

  if (params.file.size > MAX_BYTES) {
    return { ok: false, error: "File must be under 5MB" };
  }

  const ext = params.file.name.split(".").pop()?.toLowerCase() ?? "bin";
  if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) {
    return { ok: false, error: "Invalid file extension" };
  }

  const service = await createServiceClient();

  const { data: patient } = await service
    .from("patients")
    .select("id")
    .eq("id", params.patientId)
    .eq("clinic_id", params.clinicId)
    .maybeSingle();

  if (!patient) return { ok: false, error: "Patient not found in this clinic" };

  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const path = `${params.clinicId}/patients/${params.patientId}/${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const { error: uploadError } = await service.storage
    .from("clinical-documents")
    .upload(path, buffer, {
      contentType: params.file.type,
      upsert: false,
      metadata: { scan_status: "pending", clinic_id: params.clinicId },
    });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: doc, error: docError } = await service
    .from("patient_documents")
    .insert({
      patient_id: params.patientId,
      clinic_id: params.clinicId,
      name: safeName,
      document_type: params.documentType ?? (params.file.type === "application/pdf" ? "report" : "other"),
      storage_path: path,
      file_size: params.file.size,
      mime_type: params.file.type,
      uploaded_by: params.uploadedBy ?? null,
    })
    .select("id")
    .single();

  if (docError) return { ok: false, error: docError.message };

  return { ok: true, path, documentId: doc.id };
}
