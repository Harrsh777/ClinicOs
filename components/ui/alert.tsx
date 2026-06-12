import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

const icons = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

interface AlertProps {
  variant?: keyof typeof icons;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant = "info", children, className }: AlertProps) {
  const Icon = icons[variant];
  return (
    <div className={cn(`clinic-alert clinic-alert-${variant}`, className)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}
