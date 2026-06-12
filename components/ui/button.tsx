import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "clinic-btn",
        variant === "primary" && "clinic-btn-primary",
        variant === "secondary" && "clinic-btn-secondary",
        variant === "ghost" && "clinic-btn-ghost",
        variant === "danger" && "clinic-btn-danger",
        size === "sm" && "clinic-btn-sm",
        size === "lg" && "clinic-btn-lg",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
