export type DoctorQueueStatus =
  | "not_arrived"
  | "available"
  | "consulting"
  | "break"
  | "emergency"
  | "offline"
  | "finished";

export type QueuePatientType = "new" | "returning" | "emergency" | "vip" | "walk_in";

export type QueueJourneyStage =
  | "appointment_booked"
  | "checked_in"
  | "waiting"
  | "called"
  | "entered_room"
  | "consultation_started"
  | "consultation_paused"
  | "consultation_completed"
  | "billing"
  | "billing_completed"
  | "exited"
  | "no_show"
  | "cancelled";

export type QueueCardVisual =
  | "completed"
  | "waiting"
  | "consulting"
  | "emergency"
  | "returning"
  | "vip"
  | "no_show"
  | "cancelled";

export const DOCTOR_STATUS_LABELS: Record<DoctorQueueStatus, string> = {
  not_arrived: "Not Arrived",
  available: "Available",
  consulting: "Consulting",
  break: "Break",
  emergency: "Emergency",
  offline: "Offline",
  finished: "Finished for the Day",
};

export const JOURNEY_STAGE_LABELS: Record<QueueJourneyStage, string> = {
  appointment_booked: "Booked",
  checked_in: "Checked In",
  waiting: "Waiting",
  called: "Called",
  entered_room: "In Room",
  consultation_started: "Consulting",
  consultation_paused: "Paused",
  consultation_completed: "Completed",
  billing: "Billing",
  billing_completed: "Billed",
  exited: "Exited",
  no_show: "No Show",
  cancelled: "Cancelled",
};

export const PRIORITY_ORDER = { emergency: 0, vip: 1, normal: 2 } as const;

export interface EnrichedQueueToken {
  id: string;
  session_id: string;
  clinic_id: string;
  token_number: number;
  token_label?: string | null;
  patient_id: string;
  appointment_id: string | null;
  doctor_id: string | null;
  status: string;
  priority: string;
  token_series?: string | null;
  payment_status?: string | null;
  sort_order: number;
  checked_in_at: string | null;
  arrived_at: string | null;
  reason_for_visit: string | null;
  disposition: string | null;
  called_at: string | null;
  serving_at: string | null;
  completed_at: string | null;
  appointment_booked_at: string | null;
  entered_room_at: string | null;
  consultation_started_at: string | null;
  consultation_completed_at: string | null;
  consultation_paused_at: string | null;
  billing_started_at: string | null;
  billing_completed_at: string | null;
  left_clinic_at: string | null;
  status_updated_at: string | null;
  patient_type: QueuePatientType | null;
  journey_stage: QueueJourneyStage | null;
  is_returning_patient: boolean;
  estimated_wait_mins: number | null;
  consultation_duration_mins: number | null;
  created_at: string;
  updated_at: string | null;
  version: number;
  patients?: {
    full_name: string;
    phone: string;
    date_of_birth: string | null;
    gender: string | null;
  };
  appointments?: {
    appointment_time: string;
    notes: string | null;
  } | null;
  doctors?: {
    specialization: string | null;
    department: string | null;
    room_number: string | null;
    profiles?: { full_name: string };
  } | null;
}

export interface DoctorQueueInfo {
  id: string;
  profile_id: string;
  specialization: string | null;
  department: string | null;
  room_number: string | null;
  queue_status: DoctorQueueStatus;
  queue_paused: boolean;
  avg_consultation_mins: number | null;
  slot_duration_mins: number;
  profiles?: { full_name: string };
}

export interface QueueClinicSettings {
  dailyPatientCapacity: number;
  avgFeePerPatient: number;
}

export interface DoctorPredictionInput {
  doctorId: string;
  historicalAvgMins: number;
  todayAvgMins: number;
  departmentAvgMins: number;
  currentConsultationElapsedMins: number | null;
  queuePaused: boolean;
  queueStatus: DoctorQueueStatus;
}

export interface TokenPrediction {
  tokenId: string;
  estimatedMins: number | null;
  estimatedAt: Date | null;
  label: string;
}

export interface QueueAnalytics {
  avgConsultationMins: number;
  avgWaitingMins: number;
  totalPatientsSeen: number;
  noShowPct: number;
  cancellationPct: number;
  dailyThroughput: number;
  queueEfficiencyPct: number;
  estimatedCompletionAt: Date | null;
  estimatedEndOfDayAt: Date | null;
}

export interface QueueSummary {
  currentPatientRemainingMins: number | null;
  patientsRemaining: number;
  avgConsultationMins: number;
  estimatedQueueCompletionMins: number;
  estimatedLastPatientFinish: Date | null;
}

export function getPatientAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function getWaitingDurationMins(checkedInAt: string | null, createdAt: string): number {
  const start = new Date(checkedInAt ?? createdAt).getTime();
  return Math.max(0, Math.round((Date.now() - start) / 60000));
}

export function getConsultationDurationMins(
  startedAt: string | null,
  completedAt: string | null
): number | null {
  if (!startedAt) return null;
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 60000));
}

export function getTokenCardVisual(token: EnrichedQueueToken): QueueCardVisual {
  if (token.status === "no_show" || token.disposition === "no_show") return "no_show";
  if (token.status === "cancelled" || token.disposition === "cancelled") return "cancelled";
  if (token.status === "completed" || token.journey_stage === "consultation_completed" || token.journey_stage === "billing" || token.journey_stage === "billing_completed" || token.journey_stage === "exited") {
    return "completed";
  }
  if (token.priority === "emergency" || token.patient_type === "emergency" || token.token_series === "emergency") {
    return "emergency";
  }
  if (["called", "serving"].includes(token.status) || token.journey_stage === "consultation_started" || token.journey_stage === "entered_room") {
    return "consulting";
  }
  if (token.is_returning_patient || token.patient_type === "returning") return "returning";
  if (token.priority === "vip" || token.patient_type === "vip" || token.token_series === "vip") return "vip";
  return "waiting";
}

export function getPatientTypeLabel(token: EnrichedQueueToken): string {
  if (token.is_returning_patient || token.patient_type === "returning") return "Returning Patient";
  if (token.patient_type === "emergency" || token.priority === "emergency") return "Emergency";
  if (token.patient_type === "vip" || token.priority === "vip") return "VIP";
  if (token.patient_type === "walk_in") return "Walk-in";
  return "New Patient";
}

export function isActiveInQueue(token: EnrichedQueueToken): boolean {
  return !["completed", "no_show", "cancelled", "skipped"].includes(token.status)
    && !["no_show", "cancelled", "left_premises"].includes(token.disposition ?? "");
}

export function sortQueueTokens(tokens: EnrichedQueueToken[]): EnrichedQueueToken[] {
  return [...tokens].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 2;
    const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 2;
    if (pa !== pb) return pa - pb;
    return (a.sort_order ?? a.token_number) - (b.sort_order ?? b.token_number);
  });
}

export function sortTimelineTokens(tokens: EnrichedQueueToken[]): EnrichedQueueToken[] {
  const active = sortQueueTokens(tokens.filter(isActiveInQueue));
  const terminal = tokens
    .filter((t) => !isActiveInQueue(t))
    .sort((a, b) => (a.sort_order ?? a.token_number) - (b.sort_order ?? b.token_number));
  return [...active, ...terminal];
}

/** Weighted ETA: 70% doctor historical, 20% today, 10% department */
export function getWeightedConsultationMins(input: DoctorPredictionInput): number {
  const historical = input.historicalAvgMins || 15;
  const today = input.todayAvgMins || historical;
  const department = input.departmentAvgMins || historical;
  return Math.round(0.7 * historical + 0.2 * today + 0.1 * department);
}

export function predictTokenWaitMins(
  positionInQueue: number,
  input: DoctorPredictionInput
): number | null {
  if (input.queuePaused || input.queueStatus === "break" || input.queueStatus === "finished" || input.queueStatus === "offline") {
    return null;
  }

  const avgMins = getWeightedConsultationMins(input);

  let remainingCurrent = 0;
  if (input.currentConsultationElapsedMins !== null && input.queueStatus === "consulting") {
    remainingCurrent = Math.max(0, avgMins - input.currentConsultationElapsedMins);
  }

  return Math.round(remainingCurrent + Math.max(0, positionInQueue) * avgMins);
}

export function buildDoctorPredictions(
  doctor: DoctorQueueInfo,
  tokens: EnrichedQueueToken[],
  todayConsultationDurations: Map<string, number[]>,
  departmentAvgMins: number
): { doctorId: string; doctorName: string; predictions: TokenPrediction[]; avgMins: number } {
  const doctorTokens = sortQueueTokens(
    tokens.filter((t) => t.doctor_id === doctor.id && isActiveInQueue(t) && getTokenCardVisual(t) === "waiting")
  );

  const serving = tokens.find(
    (t) => t.doctor_id === doctor.id && (t.status === "serving" || t.status === "called")
  );

  const todayDurations = todayConsultationDurations.get(doctor.id) ?? [];
  const todayAvg =
    todayDurations.length > 0
      ? Math.round(todayDurations.reduce((a, b) => a + b, 0) / todayDurations.length)
      : doctor.avg_consultation_mins ?? doctor.slot_duration_mins ?? 15;

  const historical = doctor.avg_consultation_mins ?? doctor.slot_duration_mins ?? 15;

  const startedAt = serving?.consultation_started_at ?? serving?.serving_at;
  const currentElapsed = startedAt
    ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
    : null;

  const input: DoctorPredictionInput = {
    doctorId: doctor.id,
    historicalAvgMins: historical,
    todayAvgMins: todayAvg,
    departmentAvgMins,
    currentConsultationElapsedMins: currentElapsed,
    queuePaused: doctor.queue_paused,
    queueStatus: doctor.queue_status,
  };

  const avgMins = getWeightedConsultationMins(input);
  const now = Date.now();

  const predictions: TokenPrediction[] = doctorTokens.map((token, index) => {
    const estimatedMins = predictTokenWaitMins(index, input);
    return {
      tokenId: token.id,
      estimatedMins,
      estimatedAt: estimatedMins != null ? new Date(now + estimatedMins * 60000) : null,
      label: token.token_label ?? `#${String(token.token_number).padStart(2, "0")}`,
    };
  });

  return {
    doctorId: doctor.id,
    doctorName: doctor.profiles?.full_name ?? "Doctor",
    predictions,
    avgMins,
  };
}

export function computeQueueEfficiency(
  completed: number,
  checkedIn: number,
  noShows: number
): number {
  if (checkedIn === 0) return 100;
  return Math.round((completed / Math.max(checkedIn - noShows, 1)) * 100);
}

export function computeQueueAnalytics(
  tokens: EnrichedQueueToken[],
  durationsByDoctor: Record<string, number[]>,
  avgConsultationMins: number
): QueueAnalytics {
  const completed = tokens.filter((t) => t.status === "completed");
  const checkedIn = tokens.filter((t) => t.checked_in_at != null);
  const noShows = tokens.filter((t) => t.status === "no_show" || t.disposition === "no_show");
  const cancelled = tokens.filter((t) => t.status === "cancelled" || t.disposition === "cancelled");
  const waiting = tokens.filter((t) => getTokenCardVisual(t) === "waiting");

  const waitTimes = waiting.map((t) => getWaitingDurationMins(t.checked_in_at, t.created_at));
  const avgWaitingMins = waitTimes.length
    ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
    : 0;

  const allDurations = Object.values(durationsByDoctor).flat();
  const avgConsult = allDurations.length
    ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
    : avgConsultationMins;

  const checkedInCount = Math.max(checkedIn.length, 1);
  const estimatedCompletionMins = waiting.length * avgConsult;
  const estimatedCompletionAt = waiting.length > 0
    ? new Date(Date.now() + estimatedCompletionMins * 60000)
    : null;

  return {
    avgConsultationMins: avgConsult,
    avgWaitingMins,
    totalPatientsSeen: completed.length,
    noShowPct: Math.round((noShows.length / checkedInCount) * 100),
    cancellationPct: Math.round((cancelled.length / checkedInCount) * 100),
    dailyThroughput: completed.length,
    queueEfficiencyPct: computeQueueEfficiency(completed.length, checkedIn.length, noShows.length),
    estimatedCompletionAt,
    estimatedEndOfDayAt: estimatedCompletionAt,
  };
}

export function computeQueueSummary(
  tokens: EnrichedQueueToken[],
  doctors: DoctorQueueInfo[],
  durationsByDoctor: Record<string, number[]>,
  sessionAvgMins: number
): QueueSummary {
  const activeWaiting = tokens.filter((t) => getTokenCardVisual(t) === "waiting");
  const consulting = tokens.find((t) => getTokenCardVisual(t) === "consulting");

  const allDurations = Object.values(durationsByDoctor).flat();
  const avgConsult = allDurations.length
    ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
    : sessionAvgMins;

  let currentPatientRemainingMins: number | null = null;
  if (consulting) {
    const doctor = doctors.find((d) => d.id === consulting.doctor_id);
    const startedAt = consulting.consultation_started_at ?? consulting.serving_at;
    if (startedAt && doctor) {
      const elapsed = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
      const doctorAvg = doctor.avg_consultation_mins ?? doctor.slot_duration_mins ?? avgConsult;
      currentPatientRemainingMins = Math.max(0, doctorAvg - elapsed);
    }
  }

  const patientsRemaining = activeWaiting.length + (consulting ? 1 : 0);
  const estimatedQueueCompletionMins =
    (currentPatientRemainingMins ?? 0) + activeWaiting.length * avgConsult;

  return {
    currentPatientRemainingMins,
    patientsRemaining,
    avgConsultationMins: avgConsult,
    estimatedQueueCompletionMins,
    estimatedLastPatientFinish:
      patientsRemaining > 0
        ? new Date(Date.now() + estimatedQueueCompletionMins * 60000)
        : null,
  };
}

export function formatDurationMins(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatTokenNumber(num: number): string {
  return String(num).padStart(2, "0");
}
