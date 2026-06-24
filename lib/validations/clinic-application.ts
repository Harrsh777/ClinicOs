import { z } from "zod";

const indianPhone = z
  .string()
  .min(1, "Phone number is required")
  .transform((v) => v.replace(/\D/g, "").replace(/^91/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"));

const optionalGst = z
  .string()
  .optional()
  .refine((v) => !v?.trim() || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.trim().toUpperCase()), {
    message: "Invalid GST number (e.g. 22AAAAA0000A1Z5)",
  });

const optionalWebsite = z
  .string()
  .optional()
  .refine((v) => !v?.trim() || /^https?:\/\/.+/i.test(v.trim()), {
    message: "Enter a valid URL starting with https://",
  });

export const clinicStepSchema = z.object({
  clinicName: z.string().min(2, "Clinic name must be at least 2 characters").max(120),
  clinicType: z.string().min(2, "Select a clinic type"),
  doctorCount: z.coerce
    .number({ error: "Enter the number of doctors" })
    .int()
    .min(1, "At least 1 doctor required")
    .max(500, "Maximum 500 doctors"),
  city: z.string().min(2, "City is required").max(60),
  state: z.string().min(2, "Select a state"),
  phone: indianPhone,
  officialEmail: z.string().email("Enter a valid official email"),
  gst: optionalGst,
  website: optionalWebsite,
});

export const ownerStepSchema = z.object({
  ownerName: z.string().min(2, "Full name must be at least 2 characters").max(80),
  ownerEmail: z.string().email("Enter a valid email address"),
  ownerMobile: indianPhone,
  planSlug: z.enum(["free", "pro", "enterprise"], { error: "Select a plan" }),
});

export const verifyStepSchema = z.object({
  emailOtp: z.string().length(6, "Email OTP must be 6 digits"),
  mobileOtp: z.string().length(6, "Mobile OTP must be 6 digits"),
});

export const applicationSchema = clinicStepSchema
  .merge(ownerStepSchema)
  .merge(verifyStepSchema)
  .extend({
    termsAccepted: z.literal("on").or(z.literal("true")),
  });

export type ClinicApplicationData = z.infer<typeof applicationSchema>;

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = String(issue.path[0] ?? "");
    if (path && !fields[path]) fields[path] = issue.message;
  }
  return fields;
}
