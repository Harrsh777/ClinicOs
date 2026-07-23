import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { createPageMetadata } from "@/lib/seo/metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  ...createPageMetadata(),
  title: {
    default: "ClinicOS — India's First Clinic Growth Software",
    template: "%s · ClinicOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#2e63ff",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
