import type { Metadata } from "next";
import { ClinicosLanding } from "@/components/landing/clinicos-landing";

export const metadata: Metadata = {
  title: "ClinicOS — India's First AI-Powered Clinic Growth OS",
  description:
    "ClinicOS helps doctors build a bigger practice. Grow revenue, win patients back, build reputation, and scale — India's AI-powered clinic growth operating system.",
  openGraph: {
    title: "ClinicOS — India's First AI-Powered Clinic Growth OS",
    description: "Not EMR. Not practice management. The AI growth operating system that builds your practice.",
  },
};

export default function HomePage() {
  return <ClinicosLanding />;
}
