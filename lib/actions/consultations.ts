"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { calculateBillTotals } from "@/lib/billing/calculator";
import { z } from "zod";

export async function startConsultationAction(params: {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  queueTokenId?: string;
}) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("consultations")
    .select("id")
    .eq("patient_id", params.patientId)
    .eq("doctor_id", params.doctorId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (existing) {
    redirect(`/doctor/consultations/${existing.id}`);
  }

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      clinic_id: profile.clinic_id,
      patient_id: params.patientId,
      doctor_id: params.doctorId,
      appointment_id: params.appointmentId ?? null,
      queue_token_id: params.queueTokenId ?? null,
      status: "in_progress",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from("consultation_notes").insert({
    consultation_id: data.id,
    clinic_id: profile.clinic_id,
  });

  if (params.queueTokenId) {
    await supabase
      .from("queue_tokens")
      .update({ status: "serving", serving_at: new Date().toISOString() })
      .eq("id", params.queueTokenId);
  }

  revalidatePath("/doctor/consultations");
  redirect(`/doctor/consultations/${data.id}`);
}

const notesSchema = z.object({
  consultationId: z.string().uuid(),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  clinicalNotes: z.string().optional(),
});

export async function saveConsultationNotesAction(formData: FormData) {
  const profile = await requireAuth();
  const parsed = notesSchema.safeParse({
    consultationId: formData.get("consultationId"),
    symptoms: formData.get("symptoms"),
    diagnosis: formData.get("diagnosis"),
    clinicalNotes: formData.get("clinicalNotes"),
  });
  if (!parsed.success) return { error: "Invalid notes" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("consultation_notes")
    .update({
      symptoms: parsed.data.symptoms,
      diagnosis: parsed.data.diagnosis,
      clinical_notes: parsed.data.clinicalNotes,
    })
    .eq("consultation_id", parsed.data.consultationId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function endConsultationAction(consultationId: string) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();

  const { data: consultation } = await supabase
    .from("consultations")
    .select("*, consultation_notes(*), doctors(consultation_fee, profiles(full_name))")
    .eq("id", consultationId)
    .single();

  if (!consultation) return { error: "Consultation not found" };

  const notes = Array.isArray(consultation.consultation_notes)
    ? consultation.consultation_notes[0]
    : consultation.consultation_notes;

  const { data: vitals } = await supabase
    .from("patient_vitals")
    .select("*")
    .eq("patient_id", consultation.patient_id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("*, prescription_items(*)")
    .eq("consultation_id", consultationId);

  const { data: visitNum } = await supabase.rpc("get_next_visit_number", {
    p_patient_id: consultation.patient_id,
  });

  const visitNumber = visitNum ?? 1;

  await supabase.from("emr_records").insert({
    clinic_id: profile.clinic_id,
    patient_id: consultation.patient_id,
    consultation_id: consultationId,
    visit_number: visitNumber,
    summary: {
      symptoms: notes?.symptoms,
      diagnosis: notes?.diagnosis,
      clinical_notes: notes?.clinical_notes,
      doctor: (consultation.doctors as { profiles?: { full_name: string } })?.profiles?.full_name,
      prescriptions: prescriptions ?? [],
    },
    vitals_snapshot: vitals,
  });

  await supabase
    .from("consultations")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", consultationId);

  if (consultation.queue_token_id) {
    await supabase
      .from("queue_tokens")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", consultation.queue_token_id);
  }

  if (consultation.appointment_id) {
    await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", consultation.appointment_id);
  }

  const doctor = consultation.doctors as { consultation_fee: number | null } | null;
  const { data: clinic } = await supabase
    .from("clinics")
    .select("consultation_fee_default")
    .eq("id", profile.clinic_id)
    .single();

  const fee = doctor?.consultation_fee ?? clinic?.consultation_fee_default ?? 500;

  const { data: billingSettings } = await supabase
    .from("clinic_billing_settings")
    .select("tax_rate, invoice_prefix")
    .eq("clinic_id", profile.clinic_id)
    .maybeSingle();

  const taxRate = billingSettings?.tax_rate ?? 0;
  const { data: invoiceNum } = await supabase.rpc("generate_invoice_number", {
    p_clinic_id: profile.clinic_id,
  });

  const lineAmount = Number(fee);
  const { subtotal, taxAmount, totalAmount } = calculateBillTotals(
    [{ amount: lineAmount }],
    Number(taxRate)
  );

  const { data: bill } = await supabase
    .from("bills")
    .insert({
      clinic_id: profile.clinic_id,
      patient_id: consultation.patient_id,
      consultation_id: consultationId,
      invoice_number: invoiceNum ?? `INV-${Date.now()}`,
      status: "unpaid",
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      patient_amount: totalAmount,
      created_by: profile.id,
    })
    .select()
    .single();

  if (bill) {
    await supabase.from("bill_line_items").insert({
      bill_id: bill.id,
      clinic_id: profile.clinic_id,
      description: "Consultation Fee",
      item_type: "consultation",
      quantity: 1,
      unit_price: lineAmount,
      amount: lineAmount,
      reference_id: consultationId,
    });
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("user_id")
    .eq("id", consultation.patient_id)
    .single();

  if (patient?.user_id) {
    await supabase.from("notifications").insert({
      user_id: patient.user_id,
      clinic_id: profile.clinic_id,
      title: "Consultation Complete",
      body: `Visit #${visitNumber} recorded. Bill ${bill?.invoice_number} generated — ₹${totalAmount}`,
      type: "consultation",
    });
  }

  revalidatePath("/doctor/consultations");
  revalidatePath("/receptionist/billing");
  return { success: true, billId: bill?.id, visitNumber };
}

export async function getConsultation(consultationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("consultations")
    .select(`
      *,
      patients(*),
      doctors(*, profiles(full_name, specialization)),
      consultation_notes(*),
      prescriptions(*, prescription_items(*))
    `)
    .eq("id", consultationId)
    .single();
  return data;
}

export async function getPatientEmrRecords(patientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("emr_records")
    .select("*")
    .eq("patient_id", patientId)
    .order("visit_number", { ascending: false });
  return data ?? [];
}

export async function getDoctorConsultations(doctorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("consultations")
    .select("*, patients(full_name, phone)")
    .eq("doctor_id", doctorId)
    .order("started_at", { ascending: false })
    .limit(20);
  return data ?? [];
}
