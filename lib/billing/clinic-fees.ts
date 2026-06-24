export interface ClinicFeeSetup {
  normalFee: number;
  emergencyFee: number;
  taxRate: number;
  paymentMethods: {
    cash: boolean;
    upi: boolean;
    card: boolean;
  };
  doctorFees: Record<string, number>;
}

export type WalkInFeeType = "normal" | "emergency" | "custom";

export function resolveWalkInFee(
  setup: ClinicFeeSetup,
  doctorId: string,
  feeType: WalkInFeeType,
  visitType: "walk_in" | "emergency",
  customAmount?: number
): number {
  if (feeType === "custom" && customAmount != null && !Number.isNaN(customAmount) && customAmount >= 0) {
    return customAmount;
  }
  if (feeType === "emergency" || visitType === "emergency") {
    return setup.emergencyFee;
  }
  return setup.doctorFees[doctorId] ?? setup.normalFee;
}

export function feeWithTax(amount: number, taxRate: number) {
  const tax = Math.round(amount * (taxRate / 100) * 100) / 100;
  return Math.round((amount + tax) * 100) / 100;
}

export function readEmergencyFeeFromSettings(
  settings: Record<string, unknown> | null | undefined,
  normalFee: number
): number {
  const fees = (settings?.fees ?? {}) as Record<string, unknown>;
  const emergency = Number(fees.emergency);
  if (!Number.isNaN(emergency) && emergency > 0) return emergency;
  return Math.round(normalFee * 1.5);
}
