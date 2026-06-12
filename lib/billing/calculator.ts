export function calculateBillTotals(
  lineItems: { amount: number }[],
  taxRate: number
) {
  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, totalAmount };
}

export function calculateInsuranceSplit(
  totalAmount: number,
  coveragePercent: number
) {
  const insuranceAmount = Math.round(totalAmount * (coveragePercent / 100) * 100) / 100;
  const patientAmount = Math.round((totalAmount - insuranceAmount) * 100) / 100;
  return { insuranceAmount, patientAmount };
}

export function deriveBillStatus(
  totalAmount: number,
  paidAmount: number
): "unpaid" | "partial" | "paid" {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= totalAmount) return "paid";
  return "partial";
}
