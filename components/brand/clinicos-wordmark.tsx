import { cn } from "@/lib/utils";

interface ClinicOsWordmarkProps {
  className?: string;
  clinicClassName?: string;
  osClassName?: string;
}

export function ClinicOsWordmark({
  className,
  clinicClassName = "text-white",
  osClassName = "text-[var(--brand-600)]",
}: ClinicOsWordmarkProps) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      <span className={clinicClassName}>Clinic</span>
      <span className={osClassName}>Os</span>
    </span>
  );
}
