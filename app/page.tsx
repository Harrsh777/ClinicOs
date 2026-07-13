import type { Metadata } from "next";
import { ClinicosLanding } from "@/components/landing/clinicos-landing";

export const metadata: Metadata = {
  title: "ClinicOS — India's First AI-Powered Clinic Growth Platform",
  description:
    "Grow your clinic. Let AI handle everything else. Attract more patients, automate operations, recover missed revenue, and spend more time treating patients.",
  openGraph: {
    title: "ClinicOS — Grow Your Clinic. Let AI Handle Everything Else.",
    description:
      "India's first AI-powered clinic growth platform for doctors who want more patients, less admin, and higher revenue.",
  },
};

export default function HomePage() {
  return <ClinicosLanding />;
}
