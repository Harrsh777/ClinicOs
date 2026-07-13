import { createServiceClient } from "@/lib/supabase/server";
import { parseAppointmentMessage } from "@/lib/ai/appointment-bot";
import { getAvailableSlotsForDoctor, getAvailableDatesForDoctor } from "@/lib/portal/slots";
import { getTodayDateInClinicTz } from "@/lib/portal/clinic-hours";
import { formatTime } from "@/lib/utils";
import type {
  ConciergeFlow,
  ConciergeResult,
  ConciergeSession,
  DepartmentOption,
  DoctorOption,
  PatientContext,
} from "./types";
import {
  formatAskAck,
  formatAskPrompt,
  formatBookingConfirmed,
  formatDateList,
  formatDepartmentList,
  formatDoctorList,
  formatNoUpcoming,
  formatReceptionInfo,
  formatReportsInfo,
  formatReschedulePrompt,
  formatSlotList,
  formatWelcomeMenu,
  isBookingIntent,
  isMenuTrigger,
  parseMenuChoice,
  parseNumberChoice,
} from "./menu";
import {
  cancelConciergeSession,
  completeConciergeSession,
  ensurePatientRecord,
  getConciergeSession,
  lookupPatient,
  upsertConciergeSession,
} from "./session";
import { isRetentionBookingReply } from "./retention-reply";

interface HandlerContext {
  clinicId: string;
  phone: string;
  message: string;
  clinicName: string;
  clinicPhone: string | null;
  clinicSlug: string | null;
  patient: PatientContext | null;
}

async function getDepartments(clinicId: string): Promise<DepartmentOption[]> {
  const service = await createServiceClient();

  const { data: deptRows } = await service
    .from("departments")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("name");

  if (deptRows && deptRows.length > 0) {
    return deptRows.map((d, i) => ({ id: d.id, name: d.name, index: i + 1 }));
  }

  const { data: doctors } = await service
    .from("doctors")
    .select("department, specialization")
    .eq("clinic_id", clinicId)
    .eq("is_accepting_appointments", true);

  const names = new Set<string>();
  for (const d of doctors ?? []) {
    const label = d.department?.trim() || d.specialization?.trim() || "General";
    names.add(label);
  }

  return [...names].sort().map((name, i) => ({ id: null, name, index: i + 1 }));
}

async function getDoctorsForDepartment(
  clinicId: string,
  department: DepartmentOption
): Promise<DoctorOption[]> {
  const service = await createServiceClient();

  const { data: doctors } = await service
    .from("doctors")
    .select("id, specialization, department, profiles(full_name, department_id)")
    .eq("clinic_id", clinicId)
    .eq("is_accepting_appointments", true);

  const filtered = (doctors ?? []).filter((d) => {
    if (department.id) {
      const profile = d.profiles as unknown as { department_id?: string } | null;
      if (profile?.department_id === department.id) return true;
    }
    const deptLabel = d.department?.trim() || d.specialization?.trim() || "General";
    return deptLabel.toLowerCase() === department.name.toLowerCase();
  });

  return filtered.map((d, i) => {
    const profile = d.profiles as unknown as { full_name: string } | null;
    return {
      id: d.id,
      name: profile?.full_name ?? "Doctor",
      specialization: d.specialization ?? d.department,
      index: i + 1,
    };
  });
}

async function getDoctorName(doctorId: string): Promise<string> {
  const service = await createServiceClient();
  const { data } = await service
    .from("doctors")
    .select("profiles(full_name)")
    .eq("id", doctorId)
    .maybeSingle();
  const profile = data?.profiles as unknown as { full_name: string } | null;
  return profile?.full_name ?? "Doctor";
}

function formatDateLabel(dateStr: string): string {
  const today = getTodayDateInClinicTz();
  const tomorrow = new Date();
  const [y, m, d] = today.split("-").map(Number);
  tomorrow.setFullYear(y, m - 1, d + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  if (dateStr === today) return "Today";
  if (dateStr === tomorrowStr) return "Tomorrow";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

async function buildDateOptions(doctorId: string, clinicId: string) {
  const dates = await getAvailableDatesForDoctor(doctorId, clinicId, 14);
  return dates.slice(0, 7).map((date, i) => ({
    date,
    label: formatDateLabel(date),
    index: i + 1,
  }));
}

async function finalizeBooking(
  ctx: HandlerContext,
  session: ConciergeSession
): Promise<ConciergeResult> {
  const service = await createServiceClient();

  if (!session.patient_id || !session.doctor_id || !session.desired_date || !session.desired_time) {
    return {
      reply: "Something went wrong. Reply MENU to start over.",
      intent: "book_error",
      handled: true,
    };
  }

  const reason = session.reason?.trim() || "General consultation";
  const patient = ctx.patient ?? (await lookupPatient(ctx.clinicId, ctx.phone));

  if (!patient) {
    return {
      reply: "Please tell us your name first. Reply MENU to start booking.",
      intent: "book_missing_patient",
      handled: true,
    };
  }

  if (session.reschedule_appointment_id) {
    const slotOk = await getAvailableSlotsForDoctor({
      doctorId: session.doctor_id,
      clinicId: ctx.clinicId,
      date: session.desired_date,
    });
    if (!slotOk.includes(session.desired_time.slice(0, 5))) {
      return {
        reply: "That slot is no longer available. Please pick another time.",
        intent: "reschedule_slot_taken",
        handled: true,
      };
    }

    await service
      .from("appointments")
      .update({
        appointment_date: session.desired_date,
        appointment_time: session.desired_time,
        booking_notes: "Rescheduled via WhatsApp",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.reschedule_appointment_id);

    await completeConciergeSession(session.id);
    const doctorName = await getDoctorName(session.doctor_id);

    return {
      reply:
        `✅ Appointment rescheduled!\n\n` +
        `📅 ${formatDateLabel(session.desired_date)} at ${formatTime(session.desired_time)}\n` +
        `👨‍⚕️ Dr. ${doctorName}\n\n` +
        `Reply MENU for more options.`,
      intent: "reschedule_confirmed",
      handled: true,
      booked: true,
    };
  }

  const { data: result, error } = await service.rpc("book_whatsapp_appointment", {
    p_clinic_id: ctx.clinicId,
    p_patient_id: session.patient_id,
    p_doctor_id: session.doctor_id,
    p_date: session.desired_date,
    p_time: session.desired_time,
    p_reason: reason,
    p_consultation_type: session.consultation_type,
    p_apt_type: "scheduled",
  });

  if (error) {
    return {
      reply: "Something went wrong while booking. Reply MENU to try again.",
      intent: "book_error",
      handled: true,
    };
  }

  const booking = result as { ok: boolean; error?: string; appointment_id?: string };

  if (!booking.ok) {
    if (booking.error === "slot_taken") {
      await upsertConciergeSession(ctx.clinicId, ctx.phone, {
        step: "select_slot",
        time: null,
      });
      const slots = await getAvailableSlotsForDoctor({
        doctorId: session.doctor_id,
        clinicId: ctx.clinicId,
        date: session.desired_date,
      });
      return {
        reply:
          "That slot was just taken. Please pick another:\n\n" +
          formatSlotList(slots, formatDateLabel(session.desired_date)),
        intent: "book_slot_taken",
        handled: true,
      };
    }
    return {
      reply: "Unable to complete booking. Please try another slot or reply MENU.",
      intent: "book_failed",
      handled: true,
    };
  }

  await completeConciergeSession(session.id);
  const doctorName = await getDoctorName(session.doctor_id);

  return {
    reply: formatBookingConfirmed(
      patient.full_name,
      session.desired_date,
      session.desired_time,
      doctorName,
      reason
    ),
    intent: "book_confirmed",
    handled: true,
    booked: true,
    appointmentId: booking.appointment_id,
  };
}

async function startBookFlow(ctx: HandlerContext, source = "inbound"): Promise<ConciergeResult> {
  if (!ctx.patient) {
    await upsertConciergeSession(ctx.clinicId, ctx.phone, {
      flow: "book",
      step: "collect_name",
      source,
      patientId: null,
    });
    return {
      reply: "Great! Let's book your appointment.\n\nWhat's your full name?",
      intent: "book_collect_name",
      handled: true,
    };
  }

  await upsertConciergeSession(ctx.clinicId, ctx.phone, {
    flow: "book",
    step: "select_department",
    source,
    patientId: ctx.patient.id,
    patientName: ctx.patient.full_name,
  });

  const departments = await getDepartments(ctx.clinicId);
  if (departments.length === 0) {
    return {
      reply: "Sorry, no departments are available right now. Please contact reception.",
      intent: "book_no_departments",
      handled: true,
    };
  }

  if (departments.length === 1) {
    const doctors = await getDoctorsForDepartment(ctx.clinicId, departments[0]);
    if (doctors.length === 0) {
      return {
        reply: "No doctors are available in this department. Please try later.",
        intent: "book_no_doctors",
        handled: true,
      };
    }
    await upsertConciergeSession(ctx.clinicId, ctx.phone, {
      step: doctors.length === 1 ? "select_date" : "select_doctor",
      departmentId: departments[0].id,
      departmentName: departments[0].name,
      doctorId: doctors.length === 1 ? doctors[0].id : null,
    });
    if (doctors.length === 1) {
      const dates = await buildDateOptions(doctors[0].id, ctx.clinicId);
      if (dates.length === 0) {
        return {
          reply: "No available dates for this doctor. Please contact reception.",
          intent: "book_no_dates",
          handled: true,
        };
      }
      return {
        reply: `Booking with Dr. ${doctors[0].name}.\n\n${formatDateList(dates)}`,
        intent: "book_select_date",
        handled: true,
      };
    }
    return {
      reply: formatDoctorList(doctors, departments[0].name),
      intent: "book_select_doctor",
      handled: true,
    };
  }

  return {
    reply: formatDepartmentList(departments),
    intent: "book_select_department",
    handled: true,
  };
}

async function startRescheduleFlow(ctx: HandlerContext): Promise<ConciergeResult> {
  if (!ctx.patient) {
    return {
      reply: "We couldn't find your record. Reply 1 to book a new appointment.",
      intent: "reschedule_no_patient",
      handled: true,
    };
  }

  const service = await createServiceClient();
  const today = getTodayDateInClinicTz();
  const { data: apt } = await service
    .from("appointments")
    .select("id, appointment_date, appointment_time, doctor_id")
    .eq("patient_id", ctx.patient.id)
    .gte("appointment_date", today)
    .in("status", ["confirmed", "pending"])
    .order("appointment_date")
    .order("appointment_time")
    .limit(1)
    .maybeSingle();

  if (!apt) {
    return { reply: formatNoUpcoming(), intent: "reschedule_none", handled: true };
  }

  await upsertConciergeSession(ctx.clinicId, ctx.phone, {
    flow: "reschedule",
    step: "select_date",
    patientId: ctx.patient.id,
    patientName: ctx.patient.full_name,
    doctorId: apt.doctor_id,
    rescheduleAppointmentId: apt.id,
  });

  return {
    reply: formatReschedulePrompt(apt.appointment_date, apt.appointment_time),
    intent: "reschedule_select_date",
    handled: true,
  };
}

async function handleActiveStep(
  ctx: HandlerContext,
  session: ConciergeSession
): Promise<ConciergeResult> {
  const msg = ctx.message.trim();

  switch (session.step) {
    case "collect_name": {
      if (msg.length < 2) {
        return { reply: "Please enter your full name.", intent: "book_collect_name", handled: true };
      }
      const patient = await ensurePatientRecord(ctx.clinicId, ctx.phone, msg);
      ctx.patient = patient;
      return startBookFlow({ ...ctx, patient }, session.source ?? "inbound");
    }

    case "select_department": {
      const departments = await getDepartments(ctx.clinicId);
      const choice = parseNumberChoice(msg, departments.length);
      if (!choice) {
        return {
          reply: `Please reply with a number from 1 to ${departments.length}.\n\n${formatDepartmentList(departments)}`,
          intent: "book_select_department",
          handled: true,
        };
      }
      const dept = departments[choice - 1];
      const doctors = await getDoctorsForDepartment(ctx.clinicId, dept);
      if (doctors.length === 0) {
        return {
          reply: "No doctors available in this department. Pick another department.",
          intent: "book_no_doctors",
          handled: true,
        };
      }

      const nextStep = doctors.length === 1 ? "select_date" : "select_doctor";
      await upsertConciergeSession(ctx.clinicId, ctx.phone, {
        step: nextStep,
        departmentId: dept.id,
        departmentName: dept.name,
        doctorId: doctors.length === 1 ? doctors[0].id : null,
      });

      if (doctors.length === 1) {
        const dates = await buildDateOptions(doctors[0].id, ctx.clinicId);
        if (dates.length === 0) {
          return {
            reply: "No available dates. Please try another department.",
            intent: "book_no_dates",
            handled: true,
          };
        }
        return {
          reply: `Dr. ${doctors[0].name}\n\n${formatDateList(dates)}`,
          intent: "book_select_date",
          handled: true,
        };
      }

      return {
        reply: formatDoctorList(doctors, dept.name),
        intent: "book_select_doctor",
        handled: true,
      };
    }

    case "select_doctor": {
      if (!session.department_name) {
        return startBookFlow(ctx);
      }
      const departments = await getDepartments(ctx.clinicId);
      const dept =
        departments.find((d) => d.name === session.department_name) ?? departments[0];
      const doctors = await getDoctorsForDepartment(ctx.clinicId, dept);
      const choice = parseNumberChoice(msg, doctors.length);
      if (!choice) {
        return {
          reply: formatDoctorList(doctors, session.department_name),
          intent: "book_select_doctor",
          handled: true,
        };
      }
      const doctor = doctors[choice - 1];
      await upsertConciergeSession(ctx.clinicId, ctx.phone, {
        step: "select_date",
        doctorId: doctor.id,
      });
      const dates = await buildDateOptions(doctor.id, ctx.clinicId);
      if (dates.length === 0) {
        return {
          reply: "No available dates for this doctor. Pick another doctor.",
          intent: "book_no_dates",
          handled: true,
        };
      }
      return {
        reply: `Dr. ${doctor.name}\n\n${formatDateList(dates)}`,
        intent: "book_select_date",
        handled: true,
      };
    }

    case "select_date": {
      if (!session.doctor_id) {
        return { reply: "Session expired. Reply MENU to start over.", intent: "session_error", handled: true };
      }

      const dates = await buildDateOptions(session.doctor_id, ctx.clinicId);
      let selectedDate: string | undefined;

      const choice = parseNumberChoice(msg, dates.length);
      if (choice) {
        selectedDate = dates[choice - 1]?.date;
      } else {
        const parsed = parseAppointmentMessage(msg);
        selectedDate = parsed.date;
      }

      if (!selectedDate) {
        return {
          reply: `Please pick a date:\n\n${formatDateList(dates)}`,
          intent: "book_select_date",
          handled: true,
        };
      }

      const slots = await getAvailableSlotsForDoctor({
        doctorId: session.doctor_id,
        clinicId: ctx.clinicId,
        date: selectedDate,
      });

      if (slots.length === 0) {
        return {
          reply: `No slots on ${formatDateLabel(selectedDate)}. Please pick another date.\n\n${formatDateList(dates)}`,
          intent: "book_no_slots",
          handled: true,
        };
      }

      await upsertConciergeSession(ctx.clinicId, ctx.phone, {
        step: "select_slot",
        date: selectedDate,
      });

      return {
        reply: formatSlotList(slots, formatDateLabel(selectedDate)),
        intent: "book_select_slot",
        handled: true,
      };
    }

    case "select_slot": {
      if (!session.doctor_id || !session.desired_date) {
        return { reply: "Session expired. Reply MENU to start over.", intent: "session_error", handled: true };
      }

      const slots = await getAvailableSlotsForDoctor({
        doctorId: session.doctor_id,
        clinicId: ctx.clinicId,
        date: session.desired_date,
      });

      let selectedTime: string | undefined;
      const choice = parseNumberChoice(msg, Math.min(slots.length, 10));
      if (choice) {
        selectedTime = slots[choice - 1];
      } else {
        const parsed = parseAppointmentMessage(`at ${msg}`);
        selectedTime = parsed.time;
        if (selectedTime && !slots.includes(selectedTime)) {
          const match = slots.find((s) => formatTime(s) === formatTime(selectedTime!));
          selectedTime = match;
        }
      }

      if (!selectedTime) {
        return {
          reply: formatSlotList(slots, formatDateLabel(session.desired_date)),
          intent: "book_select_slot",
          handled: true,
        };
      }

      const parsed = parseAppointmentMessage(msg);
      const reason = parsed.reason;

      if (session.flow === "book" && !reason && !session.reason) {
        await upsertConciergeSession(ctx.clinicId, ctx.phone, {
          step: "collect_reason",
          time: selectedTime,
        });
        return {
          reply: `Slot ${formatTime(selectedTime)} selected.\n\nWhat's the reason for your visit? (e.g. fever, follow-up, dental checkup)`,
          intent: "book_collect_reason",
          handled: true,
        };
      }

      const updated = await upsertConciergeSession(ctx.clinicId, ctx.phone, {
        time: selectedTime,
        reason: reason ?? session.reason ?? "General consultation",
      });

      return finalizeBooking(ctx, updated);
    }

    case "collect_reason": {
      if (msg.length < 2) {
        return {
          reply: "Please briefly describe the reason for your visit.",
          intent: "book_collect_reason",
          handled: true,
        };
      }
      const updated = await upsertConciergeSession(ctx.clinicId, ctx.phone, {
        reason: msg,
      });
      return finalizeBooking(ctx, updated);
    }

    case "ask_question": {
      await completeConciergeSession(session.id);
      return { reply: formatAskAck(), intent: "ask_answered", handled: true };
    }

    default:
      return { reply: formatWelcomeMenu(ctx.clinicName, ctx.patient), intent: "menu", handled: true };
  }
}

async function startFlow(
  ctx: HandlerContext,
  flow: ConciergeFlow
): Promise<ConciergeResult> {
  switch (flow) {
    case "book":
      return startBookFlow(ctx);
    case "reschedule":
      return startRescheduleFlow(ctx);
    case "ask":
      await upsertConciergeSession(ctx.clinicId, ctx.phone, {
        flow: "ask",
        step: "ask_question",
        patientId: ctx.patient?.id ?? null,
        patientName: ctx.patient?.full_name ?? null,
      });
      return { reply: formatAskPrompt(), intent: "ask_prompt", handled: true };
    case "reports": {
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const portalUrl = ctx.clinicSlug ? `${origin}/${ctx.clinicSlug}` : undefined;
      return {
        reply: formatReportsInfo(ctx.clinicName, portalUrl),
        intent: "reports_info",
        handled: true,
      };
    }
    case "reception":
      return {
        reply: formatReceptionInfo(ctx.clinicName, ctx.clinicPhone),
        intent: "reception_info",
        handled: true,
      };
  }
}

export async function handleConciergeMessage(params: {
  clinicId: string;
  phone: string;
  message: string;
  clinicName: string;
  clinicPhone?: string | null;
  clinicSlug?: string | null;
}): Promise<ConciergeResult> {
  const patient = await lookupPatient(params.clinicId, params.phone);
  const ctx: HandlerContext = {
    clinicId: params.clinicId,
    phone: params.phone,
    message: params.message,
    clinicName: params.clinicName,
    clinicPhone: params.clinicPhone ?? null,
    clinicSlug: params.clinicSlug ?? null,
    patient,
  };

  const normalized = params.message.trim().toLowerCase();

  if (/^(menu|cancel|stop|restart)$/i.test(normalized)) {
    await cancelConciergeSession(params.clinicId, params.phone);
    return {
      reply: formatWelcomeMenu(params.clinicName, patient),
      intent: "menu",
      handled: true,
    };
  }

  const session = await getConciergeSession(params.clinicId, params.phone);
  if (session?.step && session.step !== "menu") {
    return handleActiveStep(ctx, session);
  }

  const retentionReply = await isRetentionBookingReply(params.clinicId, params.phone, params.message);

  if (isBookingIntent(params.message) || retentionReply) {
    await cancelConciergeSession(params.clinicId, params.phone);
    return startBookFlow(ctx, retentionReply ? "retention_reply" : "inbound");
  }

  const menuChoice = parseMenuChoice(params.message);
  if (menuChoice) {
    await cancelConciergeSession(params.clinicId, params.phone);
    return startFlow(ctx, menuChoice);
  }

  if (isMenuTrigger(params.message) || !session) {
    await upsertConciergeSession(params.clinicId, params.phone, {
      step: "menu",
      flow: null,
      patientId: patient?.id ?? null,
      patientName: patient?.full_name ?? null,
    });
    return {
      reply: formatWelcomeMenu(params.clinicName, patient),
      intent: "menu",
      handled: true,
    };
  }

  return {
    reply: formatWelcomeMenu(params.clinicName, patient),
    intent: "menu_fallback",
    handled: true,
  };
}
