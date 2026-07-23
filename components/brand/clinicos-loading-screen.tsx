import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

interface ClinicOsLoadingScreenProps {
  className?: string;
}

export function ClinicOsLoadingScreen({ className }: ClinicOsLoadingScreenProps) {
  return (
    <div className={cn("clinicos-loading-screen", className)}>
      <div
        className={`clinicos-loading-logo ${playfairDisplay.className}`}
        role="img"
        aria-label="ClinicOS is loading"
      >
        <span className="clinicos-loading-clinic">Clinic</span>
        <span className="clinicos-loading-os">OS</span>
      </div>
    </div>
  );
}
