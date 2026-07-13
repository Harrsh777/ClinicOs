"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  DashboardOperationsSnapshot,
  ExecutiveDashboardData,
  RevenueChartDays,
} from "@/lib/actions/executive-dashboard";
import {
  getDashboardDailyRevenue,
  getDashboardOperationsSnapshot,
} from "@/lib/actions/executive-dashboard";
import {
  IndianRupee,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserCheck,
  UserX,
  Sparkles,
  AlertTriangle,
  Heart,
  MessageSquare,
  Building2,
  Stethoscope,
  RefreshCw,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#14B8A6", "#3B82F6", "#06B6D4", "#F59E0B", "#8B5CF6", "#EF4444"];
const REVENUE_PERIODS: RevenueChartDays[] = [7, 14, 30];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(n: number) {
  return currency.format(n);
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color?: string }[];
  label?: string;
  formatter?: (value: number, name: string) => [string, string];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 shadow-lg">
      {label && <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">{label}</p>}
      {payload.map((entry) => {
        const [displayValue, displayName] = formatter
          ? formatter(entry.value, entry.name)
          : [String(entry.value), entry.name];
        return (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: entry.color ?? "var(--accent-500)" }}
            />
            <span className="text-[var(--text-secondary)]">{displayName}</span>
            <span className="ml-auto font-semibold text-[var(--text-primary)]">{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  icon,
  accent,
  href,
  trend,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  accent: string;
  href?: string;
  trend?: { text: string; positive?: boolean };
}) {
  const content = (
    <div
      className={cn(
        "group relative flex h-full min-h-[172px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-sm)] transition-all duration-200",
        href && "hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}55)` }}
      />
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.07]"
        style={{ background: accent }}
      />
      <div className="relative flex flex-1 items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">{value}</p>
          <p className="mt-1 min-h-[2.5rem] line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
            {sublabel ?? "\u00A0"}
          </p>
          <div className="mt-3 min-h-[28px]">
            {trend ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                  trend.positive === false
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700"
                )}
              >
                {trend.positive === false ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                {trend.text}
              </span>
            ) : null}
          </div>
        </div>
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `${accent}14`, color: accent }}
        >
          {icon}
        </div>
      </div>
      <div
        className={cn(
          "relative mt-auto flex min-h-[20px] items-center gap-1 pt-4 text-xs font-semibold text-[var(--brand-600)] transition-opacity",
          href ? "opacity-70 group-hover:opacity-100" : "invisible"
        )}
      >
        View details <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block h-full">{content}</Link>;
  return content;
}

function DonutChart({
  data,
  colors,
  centerLabel,
  centerValue,
  emptyLabel,
}: {
  data: { name: string; value: number }[];
  colors: string[];
  centerLabel?: string;
  centerValue?: string;
  emptyLabel: string;
}) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] text-sm text-[var(--text-secondary)]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="relative h-[200px]">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={58}
            outerRadius={82}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            content={
              <ChartTooltip formatter={(v, name) => [String(v), name]} />
            }
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-xl font-bold text-[var(--text-primary)]">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-xs text-[var(--text-muted)]">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function PeriodToggle({
  value,
  onChange,
  disabled,
}: {
  value: RevenueChartDays;
  onChange: (days: RevenueChartDays) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-0.5"
      role="group"
      aria-label="Revenue chart period"
    >
      {REVENUE_PERIODS.map((days) => (
        <button
          key={days}
          type="button"
          disabled={disabled}
          onClick={() => onChange(days)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            value === days
              ? "bg-white text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          {days}d
        </button>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  badge,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("!p-0 overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        {(actions || badge) && (
          <div className="flex shrink-0 flex-col items-end gap-2">
            {actions}
            {badge}
          </div>
        )}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

function InsightCard({
  title,
  value,
  description,
  icon,
  variant,
  href,
  actionLabel,
  showAction,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  variant: "danger" | "brand" | "warning" | "success";
  href?: string;
  actionLabel?: string;
  showAction?: boolean;
}) {
  const styles = {
    danger: {
      bg: "from-red-50 to-white",
      border: "border-red-100",
      icon: "bg-red-100 text-red-600",
      value: "text-red-600",
    },
    brand: {
      bg: "from-cyan-50 to-white",
      border: "border-cyan-100",
      icon: "bg-cyan-100 text-cyan-700",
      value: "text-cyan-700",
    },
    warning: {
      bg: "from-amber-50 to-white",
      border: "border-amber-100",
      icon: "bg-amber-100 text-amber-700",
      value: "text-amber-700",
    },
    success: {
      bg: "from-emerald-50 to-white",
      border: "border-emerald-100",
      icon: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-700",
    },
  }[variant];

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-[var(--radius-xl)] border bg-gradient-to-br p-5 shadow-[var(--shadow-sm)]",
        styles.border,
        styles.bg
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
          <p className={cn("mt-2 text-3xl font-bold tracking-tight", styles.value)}>{value}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{description}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", styles.icon)}>
          {icon}
        </div>
      </div>
      {href && actionLabel && (showAction ?? Number(value) > 0) && (
        <Link href={href} className="mt-4">
          <Button variant="ghost" size="sm" className="h-8 px-0 text-xs font-semibold">
            {actionLabel} →
          </Button>
        </Link>
      )}
    </div>
  );
}

export function ExecutiveDashboard({
  data,
  clinicId,
}: {
  data: ExecutiveDashboardData;
  clinicId: string;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [revenueDays, setRevenueDays] = useState<RevenueChartDays>(14);
  const [dailyRevenue, setDailyRevenue] = useState(data.charts.dailyRevenue);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [liveOps, setLiveOps] = useState<DashboardOperationsSnapshot>({
    operations: data.operations,
    queueStatus: data.charts.queueStatus,
  });

  const refreshOperations = useCallback(async () => {
    const snapshot = await getDashboardOperationsSnapshot(clinicId);
    setLiveOps(snapshot);
    setLastUpdated(new Date());
  }, [clinicId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshOperations();
      }
    }, 180_000);
    return () => clearInterval(interval);
  }, [refreshOperations]);

  const handleRefresh = () => {
    setRefreshing(true);
    void refreshOperations().finally(() => {
      setTimeout(() => setRefreshing(false), 800);
    });
  };

  const handleRevenuePeriodChange = useCallback(
    async (days: RevenueChartDays) => {
      if (days === revenueDays) return;
      setRevenueDays(days);
      setRevenueLoading(true);
      try {
        const series = await getDashboardDailyRevenue(clinicId, days);
        setDailyRevenue(series);
      } finally {
        setRevenueLoading(false);
      }
    },
    [clinicId, revenueDays]
  );

  const operations = liveOps.operations;
  const queueStatus = liveOps.queueStatus;

  const hasRevenue = dailyRevenue.some((d) => d.revenue > 0);
  const hasInvoices = dailyRevenue.some((d) => d.invoices > 0);
  const periodRevenueTotal = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0);
  const periodInvoiceTotal = dailyRevenue.reduce((sum, d) => sum + d.invoices, 0);
  const hasPaymentMix = data.charts.paymentMix.some((d) => d.amount > 0);
  const hasCollection = data.charts.collectionHealth.some((d) => d.value > 0);
  const totalPatients =
    data.growth.newPatients + data.growth.returningPatients + data.growth.lostPatients;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live data
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {data.isFranchise && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-xl)] border border-[var(--brand-200)] bg-gradient-to-r from-[var(--brand-50)] to-white px-6 py-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-100)] text-[var(--brand-700)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--brand-800)]">Franchise overview</p>
              <p className="text-xs text-[var(--brand-700)]">
                {data.branchCount} branches consolidated into one executive view
              </p>
            </div>
          </div>
          <Link href="/owner/franchise">
            <Button variant="secondary" size="sm">Manage branches</Button>
          </Link>
        </div>
      )}

      {/* Hero KPIs */}
      <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue today"
          value={formatCurrency(data.business.revenueToday)}
          sublabel="Collections received today"
          icon={<IndianRupee className="h-5 w-5" />}
          accent="#14B8A6"
          href="/owner/revenue"
        />
        <KpiCard
          label="Revenue this month"
          value={formatCurrency(data.business.revenueThisMonth)}
          sublabel="Month-to-date collections"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="#3B82F6"
          href="/owner/revenue"
        />
        <KpiCard
          label="Outstanding payments"
          value={formatCurrency(data.business.outstandingPayments)}
          sublabel={
            data.business.outstandingCount > 0
              ? `${data.business.outstandingCount} open invoice${data.business.outstandingCount === 1 ? "" : "s"}`
              : "All invoices settled"
          }
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="#F59E0B"
          href="/owner/billing"
          trend={
            data.business.outstandingCount > 0
              ? { text: "Needs follow-up", positive: false }
              : { text: "Healthy", positive: true }
          }
        />
        <KpiCard
          label="Patients waiting"
          value={String(operations.patientsWaiting)}
          sublabel={`${operations.averageWaitMins} min avg wait · ${operations.doctorUtilization}% utilization`}
          icon={<Users className="h-5 w-5" />}
          accent="#8B5CF6"
          href="/owner/queue"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-8"
          title="Revenue momentum"
          subtitle={`Daily collections over the last ${revenueDays} days`}
          actions={
            <PeriodToggle
              value={revenueDays}
              onChange={handleRevenuePeriodChange}
              disabled={revenueLoading}
            />
          }
          badge={
            <Badge variant="success" className="gap-1.5">
              <Activity className="h-3 w-3" />
              Finance
            </Badge>
          }
        >
          <div className="relative space-y-6">
            {revenueLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60">
                <RefreshCw className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
              </div>
            )}

            <div className="h-[220px]">
              {hasRevenue ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dailyRevenue} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="execRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      tickFormatter={(v) => (Number(v) >= 1000 ? `₹${Number(v) / 1000}k` : `₹${v}`)}
                      width={52}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v, name) =>
                            name === "revenue"
                              ? [formatCurrency(v), "Revenue"]
                              : [String(v), "Invoices"]
                          }
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#14B8A6"
                      strokeWidth={2.5}
                      fill="url(#execRevenueGrad)"
                      activeDot={{ r: 5, fill: "#14B8A6", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] text-sm text-[var(--text-secondary)]">
                  Revenue data will appear as payments are recorded
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Period total", value: formatCurrency(periodRevenueTotal) },
                {
                  label: "Avg per day",
                  value: formatCurrency(Math.round(periodRevenueTotal / revenueDays)),
                },
                {
                  label: "Invoices",
                  value: String(periodInvoiceTotal),
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-center"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border)] pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Invoice volume</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Bills created per day over the last {revenueDays} days
                  </p>
                </div>
                <ChartLegend items={[{ color: "#3B82F6", label: "Invoices" }]} />
              </div>
              <div className="h-[160px]">
                {hasInvoices ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={dailyRevenue} barSize={revenueDays <= 7 ? 28 : revenueDays <= 14 ? 18 : 10}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                        interval={revenueDays > 14 ? 2 : 0}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                        allowDecimals={false}
                        width={28}
                      />
                      <Tooltip
                        content={
                          <ChartTooltip formatter={(v) => [String(v), "Invoices"]} />
                        }
                        cursor={{ fill: "rgba(59,130,246,0.06)" }}
                      />
                      <Bar dataKey="invoices" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] text-sm text-[var(--text-secondary)]">
                    Invoice volume will appear as bills are created
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:col-span-4">
          <SectionCard
            title="Collection health"
            subtitle="Collected vs outstanding this month"
          >
            <DonutChart
              data={data.charts.collectionHealth}
              colors={["#14B8A6", "#EF4444"]}
              centerValue={
                hasCollection
                  ? `${Math.round(
                      (data.business.revenueThisMonth /
                        Math.max(
                          data.business.revenueThisMonth + data.business.outstandingPayments,
                          1
                        )) *
                        100
                    )}%`
                  : "—"
              }
              centerLabel="collected"
              emptyLabel="No billing activity yet"
            />
            <div className="mt-4">
              <ChartLegend
                items={[
                  { color: "#14B8A6", label: `Collected ${formatCurrency(data.business.revenueThisMonth)}` },
                  { color: "#EF4444", label: `Outstanding ${formatCurrency(data.business.outstandingPayments)}` },
                ]}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Doctor utilization"
            subtitle={`${operations.activeDoctors} of ${operations.totalDoctors} doctors active`}
          >
            <DonutChart
              data={[
                { name: "Active", value: operations.activeDoctors },
                { name: "Available", value: Math.max(0, operations.totalDoctors - operations.activeDoctors) },
              ]}
              colors={["#14B8A6", "#E2E8F0"]}
              centerValue={`${operations.doctorUtilization}%`}
              centerLabel="utilization"
              emptyLabel="No doctors on roster"
            />
            <div className="mt-4">
              <ChartLegend
                items={[
                  { color: "#14B8A6", label: `${operations.activeDoctors} active` },
                  { color: "#E2E8F0", label: `${Math.max(0, operations.totalDoctors - operations.activeDoctors)} available` },
                ]}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Operations & growth */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Live queue"
          subtitle="Today's patient flow"
          badge={
            <Link href="/owner/queue">
              <Button variant="ghost" size="sm" className="h-7 text-xs">Open queue</Button>
            </Link>
          }
        >
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={queueStatus} barSize={36}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {queueStatus.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Waiting", value: operations.patientsWaiting, icon: <Users className="h-4 w-4" /> },
              { label: "Avg wait", value: `${operations.averageWaitMins}m`, icon: <Clock className="h-4 w-4" /> },
              { label: "Completed", value: operations.queueCompletedToday, icon: <UserCheck className="h-4 w-4" /> },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-center"
              >
                <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[var(--accent-500)]">
                  {stat.icon}
                </div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Patient growth"
          subtitle="Retention and acquisition this month"
        >
          <DonutChart
            data={data.charts.patientMix}
            colors={["#3B82F6", "#14B8A6", "#EF4444"]}
            centerValue={String(totalPatients)}
            centerLabel="patients"
            emptyLabel="Patient data will appear as visits are recorded"
          />
          <div className="mt-4 space-y-2">
            {[
              { label: "New patients", value: data.growth.newPatients, icon: <UserPlus className="h-4 w-4" />, color: "#3B82F6" },
              { label: "Returning", value: data.growth.returningPatients, icon: <UserCheck className="h-4 w-4" />, color: "#14B8A6" },
              { label: "At risk (90d+)", value: data.growth.lostPatients, icon: <UserX className="h-4 w-4" />, color: "#EF4444" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
              >
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span style={{ color: row.color }}>{row.icon}</span>
                  {row.label}
                </div>
                {row.label === "At risk (90d+)" ? (
                  <Link href="/owner/retention" className="text-sm font-bold text-[var(--brand-600)] hover:underline">
                    {row.value} →
                  </Link>
                ) : (
                  <span className="text-sm font-bold text-[var(--text-primary)]">{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Payment mix"
          subtitle="Collections by channel (14 days)"
        >
          <div className="h-[200px]">
            {hasPaymentMix ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.charts.paymentMix}
                    dataKey="amount"
                    nameKey="method"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {data.charts.paymentMix.map((entry, index) => (
                      <Cell key={entry.method} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltip formatter={(v) => [formatCurrency(v), "Amount"]} />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] text-sm text-[var(--text-secondary)]">
                No payments recorded yet
              </div>
            )}
          </div>
          {hasPaymentMix && (
            <div className="mt-4 space-y-2">
              {data.charts.paymentMix.map((item, index) => (
                <div key={item.method} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 capitalize text-[var(--text-secondary)]">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    {item.method}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Operations summary strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Average wait time",
            value: `${operations.averageWaitMins} min`,
            icon: <Clock className="h-5 w-5" />,
            accent: "#06B6D4",
          },
          {
            label: "Doctor utilization",
            value: `${operations.doctorUtilization}%`,
            sub: `${operations.activeDoctors}/${operations.totalDoctors} active`,
            icon: <Stethoscope className="h-5 w-5" />,
            accent: "#14B8A6",
          },
          {
            label: "In service now",
            value: String(operations.queueInService),
            sub: "Patients currently being seen",
            icon: <Activity className="h-5 w-5" />,
            accent: "#8B5CF6",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-sm)]"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: `${item.accent}14`, color: item.accent }}
            >
              {item.icon}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{item.label}</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{item.value}</p>
              {item.sub && <p className="text-xs text-[var(--text-secondary)]">{item.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--accent-500)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">AI insights</h2>
            </div>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              Actionable signals from billing, follow-ups, and patient risk
            </p>
          </div>
          <Link href="/owner/ai-insights">
            <Button variant="secondary" size="sm">View all insights</Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            title="Revenue leak detected"
            value={data.aiInsights.revenueLeak}
            description="Missing bills & overdue invoices"
            icon={<TrendingDown className="h-5 w-5" />}
            variant="danger"
            href="/owner/ai-insights"
            actionLabel="Review leaks"
          />
          <InsightCard
            title="Follow-up opportunity"
            value={data.aiInsights.followUpOpportunities}
            description="Pending patient responses"
            icon={<MessageSquare className="h-5 w-5" />}
            variant="brand"
            href="/owner/ai-insights"
            actionLabel="View follow-ups"
          />
          <InsightCard
            title="High-risk patients"
            value={data.aiInsights.highRiskPatients}
            description="Active health flags"
            icon={<Heart className="h-5 w-5" />}
            variant="warning"
            href="/owner/ai-insights"
            actionLabel="Review patients"
          />
          <InsightCard
            title="Low performing branch"
            value={
              data.aiInsights.lowPerformingBranch
                ? data.aiInsights.lowPerformingBranch
                : "—"
            }
            description={
              data.aiInsights.lowPerformingBranch
                ? "Needs attention vs other branches"
                : "All branches performing well"
            }
            icon={<Building2 className="h-5 w-5" />}
            variant={data.aiInsights.lowPerformingBranch ? "warning" : "success"}
            href={data.isFranchise ? "/owner/franchise" : undefined}
            actionLabel={data.aiInsights.lowPerformingBranch ? "Compare branches" : undefined}
            showAction={!!data.aiInsights.lowPerformingBranch && data.isFranchise}
          />
        </div>
      </div>
    </div>
  );
}
