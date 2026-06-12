import { cn } from "@/lib/utils";

const variants = {
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-info",
  neutral: "badge-neutral",
  brand: "badge-brand",
} as const;

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span className={cn("clinic-badge", variants[variant], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: keyof typeof variants }> = {
    pending: { label: "Pending", variant: "warning" },
    confirmed: { label: "Confirmed", variant: "success" },
    rejected: { label: "Rejected", variant: "danger" },
    cancelled: { label: "Cancelled", variant: "neutral" },
    completed: { label: "Completed", variant: "info" },
    no_show: { label: "No Show", variant: "danger" },
    waiting: { label: "Waiting", variant: "warning" },
    called: { label: "Called", variant: "brand" },
    serving: { label: "Serving", variant: "info" },
    skipped: { label: "Skipped", variant: "neutral" },
    active: { label: "Active", variant: "success" },
    suspended: { label: "Suspended", variant: "danger" },
    trial: { label: "Trial", variant: "warning" },
    emergency: { label: "Emergency", variant: "danger" },
    vip: { label: "VIP", variant: "brand" },
    normal: { label: "Normal", variant: "neutral" },
  };

  const cfg = map[status] ?? { label: status, variant: "neutral" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
