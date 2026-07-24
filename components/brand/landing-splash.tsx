"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ClinicOsLoadingScreen } from "@/components/brand/clinicos-loading-screen";

const SPLASH_DURATION_MS = 1000;
const FADE_DURATION_MS = 300;

export function LandingSplash({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeAt = SPLASH_DURATION_MS - FADE_DURATION_MS;
    const fadeTimer = window.setTimeout(() => setFading(true), fadeAt);
    const hideTimer = window.setTimeout(() => setVisible(false), SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  return (
    <>
      {visible && (
        <ClinicOsLoadingScreen
          className={fading ? "clinicos-loading-screen--fade-out" : undefined}
        />
      )}
      {children}
    </>
  );
}
