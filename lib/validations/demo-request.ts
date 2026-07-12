import { z } from "zod";

export const DEMO_TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
] as const;

export const demoRequestSchema = z.object({
  clinicName: z.string().trim().min(2, "Clinic name is required").max(200),
  doctorName: z.string().trim().min(2, "Doctor name is required").max(120),
  contactName: z.string().trim().min(2, "Contact name is required").max(120),
  email: z.string().trim().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(100),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode")
    .optional()
    .or(z.literal("")),
  clinicType: z.string().trim().max(100).optional().or(z.literal("")),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date"),
  preferredTime: z.enum(DEMO_TIME_SLOTS, { message: "Select a time slot" }),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  clientTimezone: z.string().trim().max(80).optional().or(z.literal("")),
  screenResolution: z.string().trim().max(40).optional().or(z.literal("")),
});

export function demoRequestFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export function getMinDemoDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function getMaxDemoDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}
