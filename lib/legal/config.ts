import { siteConfig } from "@/lib/seo/site";

export const legalConfig = {
  productName: siteConfig.name,
  operatingCompany: "EaseHawk Technologies Pvt Ltd",
  brandName: siteConfig.name,
  jurisdiction: "India",
  governingState: "Karnataka",
  city: siteConfig.city,
  lastUpdated: "24 July 2026",
  effectiveDate: "24 July 2026",
  contactEmail: siteConfig.contactEmail,
  privacyEmail: "privacy@growclinicos.com",
  legalEmail: "legal@growclinicos.com",
  supportEmail: "hello@growclinicos.com",
  website: "growclinicos.com",
  grievanceOfficer: {
    name: "Harsh Srivastava",
    email: "privacy@growclinicos.com",
    responseDays: 30,
  },
} as const;
