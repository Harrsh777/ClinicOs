const DEFAULT_SITE_URL = "https://growclinicos.com";

export const siteConfig = {
  name: "ClinicOS",
  legalName: "ClinicOS Technologies Pvt. Ltd.",
  tagline: "India's First Clinic Growth Software",
  title: "ClinicOS — India's First Clinic Growth Software",
  description:
    "ClinicOS is India's first clinic growth software — an AI-powered platform that helps doctors attract patients, automate operations, recover missed revenue, and grow their practice. Founded by Harsh Srivastava.",
  shortDescription:
    "Grow your clinic with India's first AI-powered clinic growth software. More patients, less admin, higher revenue.",
  locale: "en_IN",
  language: "en-IN",
  country: "IN",
  city: "Bengaluru",
  region: "Karnataka",
  founder: {
    name: "Harsh Srivastava",
    title: "Founder & CEO",
    url: "https://harshsrivastava.in/",
  },
  contactEmail: "hello@growclinicos.com",
  keywords: [
    "clinic growth software India",
    "clinic management software India",
    "AI clinic software",
    "clinic growth platform",
    "healthcare CRM India",
    "clinic automation software",
    "patient retention software",
    "clinic booking software India",
    "doctor practice management",
    "WhatsApp clinic reminders",
    "clinic revenue growth",
    "ClinicOS",
    "Harsh Srivastava",
  ],
  social: {
    twitter: "@growclinicos",
  },
  features: [
    "AI receptionist for 24/7 patient enquiries",
    "Automated WhatsApp reminders and follow-ups",
    "Patient CRM and online booking",
    "Google review automation",
    "AI no-show prediction and recall engine",
    "Revenue insights and growth analytics",
    "Multi-doctor clinic management",
  ],
  pricingPlans: [
    { name: "Launch", price: 2999, currency: "INR", billing: "monthly" },
    { name: "Growth AI", price: 7999, currency: "INR", billing: "monthly" },
    { name: "Elite Growth Partner", price: 24999, currency: "INR", billing: "monthly" },
  ],
} as const;

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return DEFAULT_SITE_URL;
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (path === "/" || path === "") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
