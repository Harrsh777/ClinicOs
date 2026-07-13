"use client";

import { useTransition } from "react";
import { startConsultationAction } from "@/lib/actions/consultations";
import { Button } from "@/components/ui/button";
import { Stethoscope } from "lucide-react";

interface StartConsultationButtonProps {
  patientId: string;
  doctorId: string;
  consultationId?: string | null;
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}

export function StartConsultationButton({
  patientId,
  doctorId,
  consultationId,
  size = "sm",
  variant = "primary",
  className,
}: StartConsultationButtonProps) {
  const [pending, startTransition] = useTransition();

  const label = consultationId ? "Continue Consultation" : "Write Consultation";

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      loading={pending}
      onClick={() => {
        startTransition(() => {
          void startConsultationAction({ patientId, doctorId });
        });
      }}
    >
      <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
      {label}
    </Button>
  );
}
