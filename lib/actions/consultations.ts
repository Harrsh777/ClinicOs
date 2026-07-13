"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { getConsultationsBasePath } from "@/lib/auth/linked-doctor";
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
    redirect(`${getConsultationsBasePath(profile.role)}/${existing.id}`);
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
    const now = new Date().toISOString();
    await supabase
      .from("queue_tokens")
      .update({
        status: "serving",
        serving_at: now,
        consultation_started_at: now,
        journey_stage: "consultation_started",
        status_updated_at: now,
        updated_at: now,
      })
      .eq("id", params.queueTokenId);
  }

  revalidatePath("/doctor/consultations");
  revalidatePath("/owner/consultations");
  revalidatePath("/owner/my-consultations");
  revalidatePath("/owner/patients");
  revalidatePath("/doctor/patients");
  redirect(`${getConsultationsBasePath(profile.role)}/${data.id}`);
}

const notesSchema = z.object({
  consultationId: z.string().uuid(),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  clinicalNotes: z.string().optional(),
  advice: z.string().optional(),
  followUpDate: z.string().optional(),
});

export async function saveConsultationNotesAction(formData: FormData) {
  const profile = await requireAuth();
  const parsed = notesSchema.safeParse({
    consultationId: formData.get("consultationId"),
    symptoms: formData.get("symptoms"),
    diagnosis: formData.get("diagnosis"),
    clinicalNotes: formData.get("clinicalNotes"),
    advice: formData.get("advice"),
    followUpDate: formData.get("followUpDate") || undefined,
  });
  if (!parsed.success) return { error: "Invalid notes" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("consultation_notes")
    .update({
      symptoms: parsed.data.symptoms || null,
      diagnosis: parsed.data.diagnosis || null,
      clinical_notes: parsed.data.clinicalNotes || null,
      advice: parsed.data.advice || null,
      follow_up_date: parsed.data.followUpDate || null,
    })
    .eq("consultation_id", parsed.data.consultationId);

  if (error) return { error: error.message };
  revalidatePath("/owner/patients");
  revalidatePath("/doctor/patients");
  revalidatePath("/receptionist/patients");
  return { success: true };
}

export async function endConsultationAction(consultationId: string) {
  const profile = await requireAuth();
  if (!profile.clinic_id) return { error: "No clinic assigned" };

  const supabase = await createClient();

  const { data: consultation } = await supabase
    .from("consultations")
    .select(`
      *,
      consultation_notes(*),
      doctors(consultation_fee, profiles(full_name)),
      patients(full_name, phone),
      appointments(notes, booking_symptoms)
    `)
    .eq("id", consultationId)
    .single();

  if (!consultation) return { error: "Consultation not found" };

  const notes = Array.isArray(consultation.consultation_notes)
    ? consultation.consultation_notes[0]
    : consultation.consultation_notes;

  if (!notes?.diagnosis?.trim()) {
    return { error: "Diagnosis is required before ending consultation" };
  }
  if (!notes?.follow_up_date) {
    return { error: "Follow-up date is required before ending consultation" };
  }

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

  const { data: labOrders } = await supabase
    .from("lab_orders")
    .select("id, lab_order_items(lab_tests(name))")
    .eq("consultation_id", consultationId);

  const appointment = consultation.appointments as
    | { notes?: string | null; booking_symptoms?: string | null }
    | { notes?: string | null; booking_symptoms?: string | null }[]
    | null;
  const apt = Array.isArray(appointment) ? appointment[0] : appointment;
  const chiefComplaint =
    notes?.symptoms?.trim() ||
    apt?.booking_symptoms?.trim() ||
    apt?.notes?.trim() ||
    null;

  const tests =
    labOrders?.flatMap((order) => {
      const items = order.lab_order_items as { lab_tests?: { name: string } | { name: string }[] }[];
      return (items ?? []).map((item) => {
        const test = item.lab_tests;
        return Array.isArray(test) ? test[0]?.name : test?.name;
      }).filter(Boolean);
    }) ?? [];

  const { data: visitNum } = await supabase.rpc("get_next_visit_number", {
    p_patient_id: consultation.patient_id,
  });

  const visitNumber = visitNum ?? 1;
  const doctorName = (consultation.doctors as { profiles?: { full_name: string } })?.profiles?.full_name;

  const { data: emrRecord } = await supabase
    .from("emr_records")
    .insert({
      clinic_id: profile.clinic_id,
      patient_id: consultation.patient_id,
      consultation_id: consultationId,
      visit_number: visitNumber,
      summary: {
        symptoms: chiefComplaint,
        diagnosis: notes?.diagnosis,
        clinical_notes: notes?.clinical_notes,
        advice: notes?.advice,
        follow_up_date: notes?.follow_up_date,
        doctor: doctorName,
        prescriptions: prescriptions ?? [],
        tests,
      },
      vitals_snapshot: vitals,
    })
    .select("id")
    .single();

  const endedAt = new Date().toISOString();

  await supabase
    .from("consultations")
    .update({ status: "completed", ended_at: endedAt })
    .eq("id", consultationId);

  if (consultation.queue_token_id) {
    await supabase
      .from("queue_tokens")
      .update({ status: "completed", completed_at: endedAt })
      .eq("id", consultation.queue_token_id);

    if (consultation.started_at && consultation.doctor_id) {
      const durationMins = Math.round(
        (new Date(endedAt).getTime() - new Date(consultation.started_at).getTime()) / 60000
      );
      const { data: doctorRow } = await supabase
        .from("doctors")
        .select("avg_consultation_mins, slot_duration_mins")
        .eq("id", consultation.doctor_id)
        .single();
      const prev = doctorRow?.avg_consultation_mins ?? doctorRow?.slot_duration_mins ?? 15;
      const newAvg = Math.round(prev * 0.8 + durationMins * 0.2);
      await supabase
        .from("doctors")
        .update({ avg_consultation_mins: newAvg, queue_status: "available" })
        .eq("id", consultation.doctor_id);
    }
  }

  if (consultation.appointment_id) {
    await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", consultation.appointment_id);

    await supabase
      .from("clinic_visits")
      .update({ check_in_status: "completed" })
      .eq("appointment_id", consultation.appointment_id);

    const { completeFollowUpRemindersForVisit } = await import("@/lib/actions/follow-up-reminders");
    await completeFollowUpRemindersForVisit(consultation.patient_id, profile.clinic_id);
  }

  const patient = consultation.patients as { full_name: string; phone: string };
  if (emrRecord?.id && notes?.follow_up_date && patient) {
    const { scheduleFollowUpReminder } = await import("@/lib/actions/follow-up-reminders");
    await scheduleFollowUpReminder({
      clinicId: profile.clinic_id,
      patientId: consultation.patient_id,
      patientName: patient.full_name,
      patientPhone: patient.phone,
      emrRecordId: emrRecord.id,
      consultationId,
      followUpDate: notes.follow_up_date,
      diagnosis: notes.diagnosis,
      complaint: chiefComplaint,
      doctorName: doctorName ?? undefined,
      advice: notes.advice ?? undefined,
    });

    if (prescriptions?.length) {
      const { scheduleMedicineReminder } = await import("@/lib/actions/engagement-reminders");
      const medicineNames = prescriptions.flatMap((rx) => {
        const items = (rx as { prescription_items?: { medicine_name: string }[] }).prescription_items ?? [];
        return items.map((i) => i.medicine_name);
      });
      if (medicineNames.length) {
        await scheduleMedicineReminder({
          clinicId: profile.clinic_id,
          patientId: consultation.patient_id,
          patientName: patient.full_name,
          patientPhone: patient.phone,
          prescriptionId: prescriptions[0].id,
          medicineNames,
        });
      }
    }
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

  const { data: patientAccount } = await supabase
    .from("patients")
    .select("user_id")
    .eq("id", consultation.patient_id)
    .single();

  if (patientAccount?.user_id) {
    await supabase.from("notifications").insert({
      user_id: patientAccount.user_id,
      clinic_id: profile.clinic_id,
      title: "Consultation Complete",
      body: `Visit #${visitNumber} recorded. Bill ${bill?.invoice_number} generated — ₹${totalAmount}`,
      type: "consultation",
    });
  }

  revalidatePath("/doctor/consultations");
  revalidatePath("/owner/consultations");
  revalidatePath("/owner/my-consultations");
  revalidatePath("/owner/patients");
  revalidatePath("/doctor/patients");
  revalidatePath("/receptionist/billing");
  revalidatePath("/receptionist/queue");
  revalidatePath(`/doctor/patients/${consultation.patient_id}`);
  revalidatePath(`/receptionist/patients/${consultation.patient_id}`);
  revalidatePath(`/owner/patients/${consultation.patient_id}`);
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
      prescriptions(*, prescription_items(*)),
      appointments(notes, booking_symptoms, appointment_date, appointment_time)
    `)
    .eq("id", consultationId)
    .single();
  return data;
}

export async function getPatientEmrRecords(patientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("emr_records")
    .select("*, consultations(appointment_id)")
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

export async function getActiveConsultationForPatient(patientId: string, doctorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("consultations")
    .select("id, status, started_at, consultation_notes(diagnosis, symptoms, clinical_notes)")
    .eq("patient_id", patientId)
    .eq("doctor_id", doctorId)
    .eq("status", "in_progress")
    .maybeSingle();
  return data;
}
