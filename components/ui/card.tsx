import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}

export function Card({ children, className, hover, padding = true }: CardProps) {
  return (
    <div className={cn("clinic-card", hover && "clinic-card-hover", padding && "p-5", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
  backLabel = "Back",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="clinic-page-header">
      {backHref && (
        <a href={backHref} className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--brand-600)] mb-2">
          ← {backLabel}
        </a>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="clinic-page-title">{title}</h1>
          {subtitle && <p className="clinic-page-subtitle">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  accent = "#14B8A6",
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  accent?: string;
}) {
  return (
    <div className="clinic-stat-card overflow-hidden relative">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${accent}, rgba(6, 182, 212, 0.35))` }}
      />
      <div className="flex h-full items-start justify-between gap-4">
        <div>
          <div className="clinic-stat-value">{value}</div>
          <div className="clinic-stat-label">{label}</div>
          {trend && (
            <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {trend}
            </div>
          )}
        </div>
        {icon && (
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{
              background: `${accent}18`,
              color: accent,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="clinic-empty">
      {icon && <div className="clinic-empty-icon">{icon}</div>}
      <h3 className="text-base font-medium text-[var(--text-primary)]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
