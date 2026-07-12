import { z } from "zod";

const indianPhone = z
  .string()
  .min(1, "Phone number is required")
  .transform((v) => v.replace(/\D/g, "").replace(/^91/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"));

export const clinicRegistrationSchema = z.object({
  clinicName: z.string().min(2, "Clinic name is required").max(120),
  ownerName: z.string().min(2, "Owner name is required").max(80),
  email: z.string().email("Enter a valid email address"),
  phone: indianPhone,
  city: z.string().min(2, "City is required").max(60),
  state: z.string().min(2, "Select a state"),
  clinicType: z.string().min(2, "Select a clinic type"),
  doctorCount: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(500)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

export type ClinicRegistrationData = z.infer<typeof clinicRegistrationSchema>;

export function registrationFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = String(issue.path[0] ?? "");
    if (path && !fields[path]) fields[path] = issue.message;
  }
  return fields;
}
