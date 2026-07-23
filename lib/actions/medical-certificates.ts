"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { z } from "zod";
import type {
  CertificateAuditLog,
  CertificateSignature,
  CertificateTemplate,
  IssuedCertificate,
} from "@/lib/types/database";
import { sendEmail } from "@/lib/email/send";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.growclinicos.com";

// --- TEMPLATES ---

export async function getCertificateTemplates(category?: string) {
  const profile = await requireAuth();
  const service = await createServiceClient();

  let query = service
    .from("certificate_templates")
    .select("*")
    .eq("is_active", true)
    .or(`is_system.eq.true,clinic_id.eq.${profile.clinic_id}`)
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getCertificateTemplates] error:", error.message);
    return [];
  }
  return (data ?? []) as CertificateTemplate[];
}

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.string().min(1),
  description: z.string().optional(),
  contentHtml: z.string().min(10, "Template content HTML is required"),
  fieldsSchema: z.string().optional(),
});

export async function saveCertificateTemplateAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No active clinic found" };

  const parsed = templateSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    contentHtml: formData.get("contentHtml"),
    fieldsSchema: formData.get("fieldsSchema") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form input" };
  }

  let fieldsSchema = [];
  try {
    if (parsed.data.fieldsSchema) {
      fieldsSchema = JSON.parse(parsed.data.fieldsSchema);
    }
  } catch {
    fieldsSchema = [];
  }

  const service = await createServiceClient();

  if (parsed.data.id) {
    const { error } = await service
      .from("certificate_templates")
      .update({
        title: parsed.data.title,
        category: parsed.data.category,
        description: parsed.data.description,
        content_html: parsed.data.contentHtml,
        fields_schema: fieldsSchema,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("clinic_id", profile.clinic_id);

    if (error) return { error: error.message };
  } else {
    const { error } = await service.from("certificate_templates").insert({
      clinic_id: profile.clinic_id,
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      content_html: parsed.data.contentHtml,
      fields_schema: fieldsSchema,
      is_system: false,
      is_active: true,
      created_by: profile.id,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/doctor/certificates");
  revalidatePath("/doctor/certificates/templates");
  return { success: true };
}

export async function deleteCertificateTemplateAction(templateId: string) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No active clinic found" };

  const service = await createServiceClient();
  const { error } = await service
    .from("certificate_templates")
    .update({ is_active: false })
    .eq("id", templateId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };

  revalidatePath("/doctor/certificates/templates");
  return { success: true };
}

// --- SIGNATURES & STAMPS ---

export async function getDoctorSignatures() {
  const profile = await requireAuth();
  if (!profile.clinic_id) return [];

  const service = await createServiceClient();
  const { data } = await service
    .from("certificate_signatures")
    .select("*")
    .eq("clinic_id", profile.clinic_id)
    .order("created_at", { ascending: false });

  return (data ?? []) as CertificateSignature[];
}

export async function uploadCertificateSignatureAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No active clinic found" };

  const file = formData.get("file") as File | null;
  const assetType = (formData.get("assetType") as string) || "digital_signature";
  const title = (formData.get("title") as string) || "Signature Asset";

  if (!file || file.size === 0) return { error: "Please select an image file to upload" };

  const service = await createServiceClient();
  const fileExt = file.name.split(".").pop() ?? "png";
  const fileName = `${profile.clinic_id}/${profile.id}/${Date.now()}_${assetType}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadErr } = await service.storage
    .from("medical_certificates")
    .upload(fileName, buffer, {
      contentType: file.type || "image/png",
      upsert: true,
    });

  if (uploadErr) {
    // If bucket doesn't exist, handle gracefully
    console.error("[uploadSignature] storage error:", uploadErr.message);
  }

  const { data: urlData } = service.storage
    .from("medical_certificates")
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;

  const { error: dbErr } = await service.from("certificate_signatures").insert({
    clinic_id: profile.clinic_id,
    doctor_id: profile.id,
    asset_type: assetType,
    title,
    file_path: publicUrl,
  });

  if (dbErr) return { error: dbErr.message };

  revalidatePath("/doctor/certificates");
  return { success: true, url: publicUrl };
}

// --- ISSUED CERTIFICATES ---

export async function getIssuedCertificates(filters?: {
  search?: string;
  status?: string;
  patientId?: string;
}) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return [];

  const service = await createServiceClient();
  let query = service
    .from("issued_certificates")
    .select("*, patients(full_name, patient_code, phone, gender, date_of_birth), profiles!issued_certificates_doctor_id_fkey(full_name, specialization, staff_code)")
    .eq("clinic_id", profile.clinic_id)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.patientId) {
    query = query.eq("patient_id", filters.patientId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getIssuedCertificates] error:", error.message);
    return [];
  }

  let results = (data ?? []) as IssuedCertificate[];
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (c) =>
        c.certificate_code.toLowerCase().includes(q) ||
        (c.patients?.full_name ?? "").toLowerCase().includes(q) ||
        (c.diagnosis ?? "").toLowerCase().includes(q)
    );
  }

  return results;
}

export async function getIssuedCertificateById(certificateId: string) {
  const profile = await requireAuth();
  const service = await createServiceClient();

  const [{ data: certificate }, { data: logs }] = await Promise.all([
    service
      .from("issued_certificates")
      .select("*, patients(*), profiles!issued_certificates_doctor_id_fkey(full_name, specialization, staff_code), clinics(name, address, city, state, phone, email, clinic_code)")
      .eq("id", certificateId)
      .single(),
    service
      .from("certificate_audit_logs")
      .select("*, profiles(full_name)")
      .eq("certificate_id", certificateId)
      .order("created_at", { ascending: false }),
  ]);

  if (!certificate) return null;

  return {
    certificate: certificate as IssuedCertificate & {
      clinics?: { name: string; address?: string; city?: string; state?: string; phone?: string; email?: string; clinic_code: string };
    },
    auditLogs: (logs ?? []) as (CertificateAuditLog & { profiles?: { full_name: string } })[],
  };
}

const issueSchema = z.object({
  templateId: z.string().uuid().optional(),
  patientId: z.string().uuid("Please select a patient"),
  diagnosis: z.string().min(2, "Diagnosis is required"),
  restDurationDays: z.coerce.number().min(0).default(0),
  issueDate: z.string().min(1, "Issue date is required"),
  expiryDate: z.string().optional(),
  signatureUrl: z.string().optional(),
  stampUrl: z.string().optional(),
  watermarkText: z.string().optional(),
  customContentHtml: z.string().optional(),
});

export async function issueCertificateAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No active clinic found" };

  const parsed = issueSchema.safeParse({
    templateId: formData.get("templateId") || undefined,
    patientId: formData.get("patientId"),
    diagnosis: formData.get("diagnosis"),
    restDurationDays: formData.get("restDurationDays") || 0,
    issueDate: formData.get("issueDate"),
    expiryDate: formData.get("expiryDate") || undefined,
    signatureUrl: formData.get("signatureUrl") || undefined,
    stampUrl: formData.get("stampUrl") || undefined,
    watermarkText: formData.get("watermarkText") || undefined,
    customContentHtml: formData.get("customContentHtml") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid certificate data" };
  }

  const service = await createServiceClient();

  // Fetch Patient & Clinic info for rendering placeholders
  const [{ data: patient }, { data: clinic }] = await Promise.all([
    service.from("patients").select("*").eq("id", parsed.data.patientId).single(),
    service.from("clinics").select("*").eq("id", profile.clinic_id).single(),
  ]);

  if (!patient) return { error: "Patient record not found" };
  if (!clinic) return { error: "Clinic record not found" };

  // Generate unique certificate code via RPC
  const { data: certCodeData } = await service.rpc("generate_certificate_code", {
    p_clinic_id: profile.clinic_id,
  });

  const certCode = (certCodeData as string) ?? `CERT-${Date.now().toString().slice(-6)}`;
  const qrToken = crypto.randomUUID().replace(/-/g, "");

  // Calculate patient age
  let patientAge = "N/A";
  if (patient.date_of_birth) {
    const dob = new Date(patient.date_of_birth);
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff);
    patientAge = String(Math.abs(ageDate.getUTCFullYear() - 1970));
  }

  // Get raw template HTML or custom HTML
  let rawHtml = parsed.data.customContentHtml ?? "";
  let templateVersion = 1;

  if (parsed.data.templateId) {
    const { data: tmpl } = await service
      .from("certificate_templates")
      .select("content_html, version")
      .eq("id", parsed.data.templateId)
      .single();
    if (tmpl) {
      rawHtml = tmpl.content_html;
      templateVersion = tmpl.version;
    }
  }

  const verifyUrl = `${APP_URL}/c/${clinic.slug}/verify-certificate/${qrToken}`;

  // Replace placeholders with real values
  const renderedHtml = rawHtml
    .replaceAll("{{patient_name}}", patient.full_name)
    .replaceAll("{{patient_age}}", patientAge)
    .replaceAll("{{patient_gender}}", patient.gender ?? "N/A")
    .replaceAll("{{patient_address}}", patient.address ?? "N/A")
    .replaceAll("{{patient_id}}", patient.patient_code ?? patient.id.slice(0, 8))
    .replaceAll("{{doctor_name}}", profile.full_name)
    .replaceAll("{{clinic_name}}", clinic.name)
    .replaceAll("{{diagnosis}}", parsed.data.diagnosis)
    .replaceAll("{{rest_days}}", String(parsed.data.restDurationDays))
    .replaceAll("{{issue_date}}", parsed.data.issueDate)
    .replaceAll("{{expiry_date}}", parsed.data.expiryDate ?? "N/A")
    .replaceAll("{{certificate_id}}", certCode)
    .replaceAll("{{verification_url}}", verifyUrl);

  const { data: cert, error: insertErr } = await service
    .from("issued_certificates")
    .insert({
      certificate_code: certCode,
      clinic_id: profile.clinic_id,
      template_id: parsed.data.templateId ?? null,
      template_version: templateVersion,
      patient_id: patient.id,
      doctor_id: profile.id,
      issued_at: new Date().toISOString(),
      expiry_date: parsed.data.expiryDate ?? null,
      status: "issued",
      diagnosis: parsed.data.diagnosis,
      rest_duration_days: parsed.data.restDurationDays,
      rendered_html: renderedHtml,
      signature_url: parsed.data.signatureUrl ?? null,
      stamp_url: parsed.data.stampUrl ?? null,
      qr_verification_token: qrToken,
      watermark_text: parsed.data.watermarkText ?? "OFFICIAL MEDICAL CERTIFICATE",
    })
    .select()
    .single();

  if (insertErr || !cert) return { error: insertErr?.message ?? "Failed to issue certificate" };

  // Log audit event
  await service.from("certificate_audit_logs").insert({
    certificate_id: cert.id,
    action: "signed_and_issued",
    performed_by: profile.id,
    details: {
      certificate_code: certCode,
      patient_name: patient.full_name,
      diagnosis: parsed.data.diagnosis,
    },
  });

  revalidatePath("/doctor/certificates");
  revalidatePath(`/doctor/patients/${patient.id}`);
  return { success: true, certificateId: cert.id, certificateCode: certCode };
}

export async function revokeCertificateAction(formData: FormData) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No active clinic found" };

  const certificateId = formData.get("certificateId") as string;
  const reason = (formData.get("reason") as string) || "Revoked by issuing doctor";

  if (!certificateId) return { error: "Missing certificate ID" };

  const service = await createServiceClient();

  const { error } = await service
    .from("issued_certificates")
    .update({
      status: "revoked",
      revoked_reason: reason,
      revoked_at: new Date().toISOString(),
      revoked_by: profile.id,
    })
    .eq("id", certificateId)
    .eq("clinic_id", profile.clinic_id);

  if (error) return { error: error.message };

  await service.from("certificate_audit_logs").insert({
    certificate_id: certificateId,
    action: "revoked",
    performed_by: profile.id,
    details: { reason },
  });

  revalidatePath("/doctor/certificates");
  revalidatePath(`/doctor/certificates/${certificateId}`);
  return { success: true };
}

// --- PUBLIC VERIFICATION ---

export async function verifyCertificatePublicAction(qrToken: string) {
  const service = await createServiceClient();
  const { data: cert } = await service
    .from("issued_certificates")
    .select("*, patients(full_name, patient_code, gender, date_of_birth), profiles!issued_certificates_doctor_id_fkey(full_name, specialization, staff_code), clinics(name, address, city, state, phone, email, clinic_code)")
    .eq("qr_verification_token", qrToken)
    .single();

  if (!cert) return null;

  // Log verification scan audit
  await service.from("certificate_audit_logs").insert({
    certificate_id: cert.id,
    action: "viewed_via_qr",
    performed_by: null,
    details: { timestamp: new Date().toISOString() },
  });

  return cert;
}

// --- EMAIL CERTIFICATE ---

export async function sendCertificateEmailAction(certificateId: string, recipientEmail: string) {
  const profile = await requireAuth();
  const service = await createServiceClient();

  const { data: cert } = await service
    .from("issued_certificates")
    .select("*, patients(full_name), clinics(slug, name)")
    .eq("id", certificateId)
    .single();

  if (!cert) return { error: "Certificate not found" };

  const clinic = cert.clinics as { slug: string; name: string } | null;
  const verifyUrl = `${APP_URL}/c/${clinic?.slug ?? "clinic"}/verify-certificate/${cert.qr_verification_token}`;

  const emailResult = await sendEmail({
    to: recipientEmail,
    subject: `Medical Certificate — ${cert.certificate_code} from ${clinic?.name ?? "ClinicOS"}`,
    html: `
      <div style="font-family: system-ui, sans-serif; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">Medical Certificate Issued</h2>
        <p>Hi ${(cert.patients as { full_name: string })?.full_name ?? "Patient"},</p>
        <p>Your medical certificate <strong>${cert.certificate_code}</strong> has been issued by <strong>${clinic?.name}</strong>.</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Diagnosis:</strong> ${cert.diagnosis ?? "N/A"}</p>
          <p style="margin: 4px 0;"><strong>Issue Date:</strong> ${new Date(cert.issued_at).toLocaleDateString()}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> ${cert.status.toUpperCase()}</p>
        </div>
        <p style="margin-top: 24px;">
          <a href="${verifyUrl}" style="background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            View & Verify Official Certificate
          </a>
        </p>
        <p style="font-size: 13px; color: #64748b; margin-top: 24px;">You can scan the QR code on your certificate anytime to verify document authenticity.</p>
      </div>
    `,
  });

  if (!emailResult.ok) return { error: emailResult.error };

  await service.from("certificate_audit_logs").insert({
    certificate_id: certificateId,
    action: "emailed",
    performed_by: profile.id,
    details: { recipient: recipientEmail },
  });

  revalidatePath(`/doctor/certificates/${certificateId}`);
  return { success: true };
}
