"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  DashboardAppointment,
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
  Users,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Sparkles,
  AlertTriangle,
  Heart,
  MessageSquare,
  Building2,
  Stethoscope,
  RefreshCw,
  ArrowUpRight,
  Search,
  Upload,
  Calendar,
  Clock,
  MoreHorizontal,
  ChevronDown,
  Activity,
  CalendarPlus,
  Send,
  Receipt,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const CHART_BLUE = "#2563EB";
const CHART_BLUE_LIGHT = "#93C5FD";
const CHART_BLUE_MID = "#60A5FA";
const REVENUE_PERIODS: RevenueChartDays[] = [7, 14, 30];

const CHART_TOOLTIP_PROPS = {
  allowEscapeViewBox: { x: true, y: true } as const,
  wrapperStyle: { zIndex: 60, pointerEvents: "none" as const },
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(n: number) {
  return currency.format(n);
}

function formatGrowth(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  booked: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-slate-50 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

function MiniSparkline({ data, color = CHART_BLUE }: { data: number[]; color?: string }) {
  const chartData = data.map((value, i) => ({ i, value }));
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height={48}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${color})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  label,
  value,
  growth,
  icon,
  iconBg,
  sparkline,
  href,
}: {
  label: string;
  value: string;
  growth?: number;
  icon: React.ReactNode;
  iconBg: string;
  sparkline?: number[];
  href?: string;
}) {
  const positive = (growth ?? 0) >= 0;
  const content = (
    <Card hover className="relative flex h-full min-h-[10.5rem] flex-col overflow-hidden !p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">{value}</p>
          <div className="mt-2 flex h-5 items-center gap-1">
            {growth !== undefined ? (
              <>
                {positive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-[var(--success-500)]" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[var(--danger-500)]" />
                )}
                <span
                  className={cn(
                    "text-xs font-semibold",
                    positive ? "text-[var(--success-500)]" : "text-[var(--danger-500)]"
                  )}
                >
                  {formatGrowth(growth)}
                </span>
              </>
            ) : (
              <span className="text-xs text-transparent select-none" aria-hidden>
                —
              </span>
            )}
          </div>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `${iconBg}18`, color: iconBg }}
        >
          {icon}
        </div>
      </div>
      <div className="mt-auto h-12 pt-3">
        {sparkline && sparkline.length > 0 ? (
          <MiniSparkline data={sparkline} color={iconBg} />
        ) : (
          <div className="h-12" aria-hidden />
        )}
      </div>
    </Card>
  );

  if (href) return <Link href={href} className="block h-full w-full">{content}</Link>;
  return content;
}

function DashboardCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("!p-0", className)} hover>
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", style)}>
      {status}
    </span>
  );
}

function AppointmentsTable({
  appointments,
  sortBy,
  onSort,
  statusFilter,
  onStatusFilter,
}: {
  appointments: DashboardAppointment[];
  sortBy: "date" | "patient";
  onSort: (v: "date" | "patient") => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
}) {
  const filtered = useMemo(() => {
    let list = [...appointments];
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    list.sort((a, b) => {
      if (sortBy === "patient") return a.patientName.localeCompare(b.patientName);
      return `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
    });
    return list;
  }, [appointments, sortBy, statusFilter]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] py-12 text-center">
        <Calendar className="mb-3 h-8 w-8 text-[var(--text-muted)] opacity-50" />
        <p className="text-sm font-medium text-[var(--text-primary)]">No appointments found</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Appointments will appear here as they are booked</p>
        <Link href="/owner/appointments" className="mt-4">
          <Button size="sm" className="gap-2">
            <CalendarPlus className="h-3.5 w-3.5" />
            Book Appointment
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="clinic-table">
        <thead>
          <tr>
            <th>Assigned Doctor</th>
            <th>
              <button type="button" onClick={() => onSort("patient")} className="flex items-center gap-1 hover:text-[var(--text-primary)]">
                Patient Name
                <ChevronDown className={cn("h-3 w-3", sortBy === "patient" && "text-[var(--brand-600)]")} />
              </button>
            </th>
            <th>
              <button type="button" onClick={() => onSort("date")} className="flex items-center gap-1 hover:text-[var(--text-primary)]">
                Date
                <ChevronDown className={cn("h-3 w-3", sortBy === "date" && "text-[var(--brand-600)]")} />
              </button>
            </th>
            <th>Reason</th>
            <th>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilter(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium normal-case text-[var(--text-secondary)]"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="booked">Booked</option>
              </select>
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((apt) => (
            <tr key={apt.id} className="transition-colors duration-200 hover:bg-[var(--surface-1)]">
              <td>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-50)] text-xs font-semibold text-[var(--brand-600)]">
                    {getInitials(apt.doctorName)}
                  </div>
                  <span className="text-sm font-medium">{apt.doctorName}</span>
                </div>
              </td>
              <td className="text-sm">{apt.patientName}</td>
              <td className="text-sm text-[var(--text-secondary)]">
                {new Date(apt.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                <span className="ml-1 text-[var(--text-muted)]">{apt.time}</span>
              </td>
              <td className="text-sm text-[var(--text-secondary)]">{apt.reason ?? "—"}</td>
              <td><StatusPill status={apt.status} /></td>
              <td>
                <Link href="/owner/appointments">
                  <button type="button" className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-1)] hover:text-[var(--brand-600)]">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string; color?: string; hide?: boolean }[];
  label?: string | number;
  formatter?: (value: number, name: string) => [string, string];
}) {
  const items = payload?.filter((entry) => entry.value != null && !entry.hide) ?? [];
  if (!active || items.length === 0) return null;
  return (
    <div className="min-w-[9rem] rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 shadow-lg">
      {label != null && label !== "" && (
        <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">{label}</p>
      )}
      {items.map((entry, index) => {
        const name = String(entry.name ?? "");
        const value = Number(entry.value ?? 0);
        const [displayValue, displayName] = formatter
          ? formatter(value, name)
          : [String(entry.value), name];
        return (
          <div key={`${name}-${index}`} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color ?? CHART_BLUE }} />
            <span className="text-[var(--text-secondary)]">{displayName}</span>
            <span className="ml-auto font-semibold text-[var(--text-primary)]">{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ExecutiveDashboard({
  data,
  clinicId,
  userName,
}: {
  data: ExecutiveDashboardData;
  clinicId: string;
  userName: string;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [liveTime, setLiveTime] = useState(() => new Date());
  const [revenueDays, setRevenueDays] = useState<RevenueChartDays>(14);
  const [dailyRevenue, setDailyRevenue] = useState(data.charts.dailyRevenue);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("week");
  const [aptSort, setAptSort] = useState<"date" | "patient">("date");
  const [aptStatusFilter, setAptStatusFilter] = useState("all");
  const [chartTooltipPortal, setChartTooltipPortal] = useState<HTMLElement | null>(null);
  const [liveOps, setLiveOps] = useState<DashboardOperationsSnapshot>({
    operations: {
      patientsWaiting: data.operations.patientsWaiting,
      averageWaitMins: data.operations.averageWaitMins,
      doctorUtilization: data.operations.doctorUtilization,
      activeDoctors: data.operations.activeDoctors,
      totalDoctors: data.operations.totalDoctors,
      queueInService: data.operations.queueInService,
      queueCompletedToday: data.operations.queueCompletedToday,
    },
    queueStatus: data.charts.queueStatus,
  });

  const firstName = userName.split(" ")[0];

  const refreshOperations = useCallback(async () => {
    const snapshot = await getDashboardOperationsSnapshot(clinicId);
    setLiveOps(snapshot);
  }, [clinicId]);

  useEffect(() => {
    setChartTooltipPortal(document.body);
  }, []);

  useEffect(() => {
    const clock = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refreshOperations();
    }, 180_000);
    return () => clearInterval(interval);
  }, [refreshOperations]);

  const handleRefresh = () => {
    setRefreshing(true);
    void refreshOperations().finally(() => setTimeout(() => setRefreshing(false), 800));
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

  const operations = {
    ...data.operations,
    ...liveOps.operations,
  };
  const hasRevenue = dailyRevenue.some((d) => d.revenue > 0);
  const weeklyTotal = data.charts.weeklyPatients.reduce((s, d) => s + d.total, 0);

  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return data.appointments;
    const q = searchQuery.toLowerCase();
    return data.appointments.filter(
      (a) => a.patientName.toLowerCase().includes(q) || a.doctorName.toLowerCase().includes(q)
    );
  }, [data.appointments, searchQuery]);

  const quickActions = [
    { label: "Add Patient", icon: UserPlus, href: "/owner/patients/new", color: CHART_BLUE },
    { label: "Book Appointment", icon: CalendarPlus, href: "/owner/appointments", color: "#8B5CF6" },
    { label: "Send Reminder", icon: Send, href: "/owner/ai-insights", color: "#F59E0B" },
    { label: "Billing", icon: Receipt, href: "/owner/billing", color: "#22C55E" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Welcome Back {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Patient reports here always update in real time.
          </p>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:min-w-[16rem] sm:flex-none sm:w-64">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              placeholder="Search anything here..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="clinic-input h-10 w-full rounded-2xl py-2.5 pl-10 pr-4"
            />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="clinic-input !w-auto h-10 shrink-0 rounded-2xl py-2.5 pl-3 pr-7 text-sm"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>
          <Button className="h-10 shrink-0 gap-2 rounded-2xl whitespace-nowrap">
            <Upload className="h-4 w-4" />
            Export
          </Button>
          <Button variant="secondary" size="sm" className="h-10 w-10 shrink-0 gap-2 rounded-xl p-0" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live data
        </span>
        <span className="text-xs font-medium tabular-nums text-[var(--text-muted)]" suppressHydrationWarning>
          {liveTime.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </span>
      </div>

      {data.isFranchise && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-xl)] border border-[var(--brand-200)] bg-gradient-to-r from-[var(--brand-50)] to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-100)] text-[var(--brand-600)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--brand-800)]">Franchise overview</p>
              <p className="text-xs text-[var(--brand-700)]">{data.branchCount} branches consolidated</p>
            </div>
          </div>
          <Link href="/owner/franchise">
            <Button variant="secondary" size="sm">Manage branches</Button>
          </Link>
        </div>
      )}

      {/* KPI row — 12-col grid */}
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <div className="col-span-12 flex sm:col-span-6 lg:col-span-3">
          <KpiCard
            label="Total Patients"
            value={operations.totalPatients.toLocaleString("en-IN")}
            growth={data.business.patientGrowth}
            icon={<Users className="h-5 w-5" />}
            iconBg={CHART_BLUE}
            sparkline={data.charts.sparklinePatients}
            href="/owner/patients"
          />
        </div>
        <div className="col-span-12 flex sm:col-span-6 lg:col-span-3">
          <KpiCard
            label="Consultations"
            value={operations.totalConsultations.toLocaleString("en-IN")}
            growth={data.business.consultationGrowth}
            icon={<Stethoscope className="h-5 w-5" />}
            iconBg="#8B5CF6"
            href="/owner/consultations"
          />
        </div>
        <div className="col-span-12 flex sm:col-span-6 lg:col-span-3">
          <KpiCard
            label="Revenue Today"
            value={formatCurrency(data.business.revenueToday)}
            growth={data.business.revenueGrowth}
            icon={<IndianRupee className="h-5 w-5" />}
            iconBg="#22C55E"
            sparkline={data.charts.sparklineRevenue}
            href="/owner/revenue"
          />
        </div>
        <div className="col-span-12 flex sm:col-span-6 lg:col-span-3">
          <KpiCard
            label="Patients Waiting"
            value={String(operations.patientsWaiting)}
            icon={<Clock className="h-5 w-5" />}
            iconBg="#F59E0B"
            href="/owner/queue"
          />
        </div>

        {/* Patient statistics chart */}
        <div className="col-span-12 lg:col-span-5">
          <DashboardCard
            title="Patient Statistics"
            subtitle={`${weeklyTotal.toLocaleString("en-IN")} visits this week`}
            action={
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--success-500)]">
                <TrendingUp className="h-3.5 w-3.5" />
                {formatGrowth(data.business.patientGrowth)}
              </span>
            }
          >
            <div className="h-[220px] overflow-visible">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.charts.weeklyPatients} barSize={28}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={32} />
                  <Tooltip
                    {...CHART_TOOLTIP_PROPS}
                    shared
                    portal={chartTooltipPortal}
                    content={(props) => <ChartTooltip {...props} />}
                    cursor={{ fill: "rgba(37,99,235,0.06)" }}
                  />
                  <Bar dataKey="new" stackId="a" fill={CHART_BLUE_LIGHT} radius={[0, 0, 0, 0]} name="New" />
                  <Bar dataKey="returning" stackId="a" fill={CHART_BLUE_MID} radius={[0, 0, 0, 0]} name="Returning" />
                  <Bar dataKey="total" fill={CHART_BLUE} radius={[8, 8, 0, 0]} name="Total" hide />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {[
                { color: CHART_BLUE_LIGHT, label: "New Patients" },
                { color: CHART_BLUE_MID, label: "Returning" },
                { color: CHART_BLUE, label: "Total Care" },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </DashboardCard>
        </div>

        {/* Revenue chart */}
        <div className="col-span-12 lg:col-span-7">
          <DashboardCard
            title="Revenue & Bookings"
            subtitle={`Daily collections over ${revenueDays} days`}
            action={
              <div className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-0.5">
                {REVENUE_PERIODS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    disabled={revenueLoading}
                    onClick={() => handleRevenuePeriodChange(days)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200",
                      revenueDays === days
                        ? "bg-white text-[var(--brand-600)] shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    )}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            }
          >
            <div className="relative h-[220px] overflow-visible">
              {revenueLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm">
                  <RefreshCw className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
                </div>
              )}
              {hasRevenue ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dailyRevenue} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_BLUE} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={CHART_BLUE} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      tickFormatter={(v) => (Number(v) >= 1000 ? `₹${Number(v) / 1000}k` : `₹${v}`)}
                      width={48}
                    />
                    <Tooltip
                      {...CHART_TOOLTIP_PROPS}
                      portal={chartTooltipPortal}
                      content={(props) => (
                        <ChartTooltip
                          {...props}
                          formatter={(v, name) =>
                            name === "revenue" ? [formatCurrency(v), "Revenue"] : [String(v), "Invoices"]
                          }
                        />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={CHART_BLUE}
                      strokeWidth={2.5}
                      fill="url(#revenueGrad)"
                      activeDot={{ r: 5, fill: CHART_BLUE, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] text-sm text-[var(--text-secondary)]">
                  Revenue data will appear as payments are recorded
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        {/* Appointments table */}
        <div className="col-span-12 lg:col-span-8">
          <DashboardCard
            title="All Appointments"
            subtitle="Upcoming scheduled visits"
            action={
              <Link href="/owner/appointments" className="text-sm font-semibold text-[var(--brand-600)] hover:underline">
                See More
              </Link>
            }
          >
            <AppointmentsTable
              appointments={filteredAppointments}
              sortBy={aptSort}
              onSort={setAptSort}
              statusFilter={aptStatusFilter}
              onStatusFilter={setAptStatusFilter}
            />
          </DashboardCard>
        </div>

        {/* Doctor availability */}
        <div className="col-span-12 lg:col-span-4">
          <DashboardCard
            title="Doctor List"
            subtitle={new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          >
            {data.doctors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] py-8 text-center text-sm text-[var(--text-secondary)]">
                No doctors on roster yet
              </div>
            ) : (
              <div className="space-y-3">
                {data.doctors.slice(0, 4).map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-all duration-200 hover:border-[var(--brand-200)] hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{doc.shiftLabel}</p>
                      <span className="text-xs text-[var(--text-muted)]">{doc.shiftTime}</span>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-xs font-medium",
                        doc.isAvailable ? "text-[var(--brand-600)]" : "text-[var(--danger-500)]"
                      )}
                    >
                      {doc.isAvailable ? "Available to consult" : "Unavailable to consult"}
                    </p>
                    <div className="mt-3 flex items-center">
                      <div className="flex -space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[var(--brand-600)] text-[10px] font-bold text-white">
                          {doc.avatarInitials}
                        </div>
                      </div>
                      <span className="ml-2 text-sm font-medium text-[var(--text-primary)]">{doc.name}</span>
                      {doc.specialization && (
                        <span className="ml-auto text-xs text-[var(--text-muted)]">{doc.specialization}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/owner/staff" className="mt-4 block">
              <Button variant="secondary" size="sm" className="w-full">View all doctors</Button>
            </Link>
          </DashboardCard>
        </div>

        {/* Recent activity */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <DashboardCard title="Recent Activity" subtitle="Latest clinic events">
            {data.recentActivity.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--text-muted)]">No recent activity</div>
            ) : (
              <div className="space-y-0">
                {data.recentActivity.map((item, i) => (
                  <div key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < data.recentActivity.length - 1 && (
                      <div className="absolute left-[15px] top-8 h-full w-px bg-[var(--border)]" />
                    )}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-50)] text-[var(--brand-600)]">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize text-[var(--text-primary)]">{item.action}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{item.description}</p>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        {new Date(item.time).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>
        </div>

        {/* Calendar preview */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <DashboardCard
            title="Calendar"
            subtitle={new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          >
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="py-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">{d}</div>
              ))}
              {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {data.calendarDays.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "relative rounded-xl py-1.5 text-xs font-medium transition-all duration-200",
                    day.isToday
                      ? "bg-[var(--brand-600)] text-white shadow-md"
                      : day.appointmentCount > 0
                        ? "bg-[var(--brand-50)] text-[var(--brand-600)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                  )}
                >
                  {day.day}
                  {day.appointmentCount > 0 && !day.isToday && (
                    <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--brand-600)]" />
                  )}
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>

        {/* Quick actions */}
        <div className="col-span-12 lg:col-span-4">
          <DashboardCard title="Quick Actions" subtitle="Common tasks at your fingertips">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-center transition-all duration-200 hover:border-[var(--brand-200)] hover:bg-white hover:shadow-md"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                    style={{ background: `${action.color}14`, color: action.color }}
                  >
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{action.label}</span>
                </Link>
              ))}
            </div>
          </DashboardCard>
        </div>

        {/* AI Insights */}
        <div className="col-span-12">
          <DashboardCard
            title="AI Insights & Recommendations"
            subtitle="Actionable signals from billing, follow-ups, and patient risk"
            action={
              <Link href="/owner/ai-insights">
                <Button variant="secondary" size="sm" className="gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  View all
                </Button>
              </Link>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Revenue leak detected",
                  value: data.aiInsights.revenueLeak,
                  desc: "Missing bills & overdue invoices",
                  icon: <TrendingDown className="h-5 w-5" />,
                  color: "#EF4444",
                  href: "/owner/ai-insights",
                },
                {
                  title: "Follow-up opportunity",
                  value: data.aiInsights.followUpOpportunities,
                  desc: "Pending patient responses",
                  icon: <MessageSquare className="h-5 w-5" />,
                  color: CHART_BLUE,
                  href: "/owner/ai-insights",
                },
                {
                  title: "High-risk patients",
                  value: data.aiInsights.highRiskPatients,
                  desc: "Active health flags",
                  icon: <Heart className="h-5 w-5" />,
                  color: "#F59E0B",
                  href: "/owner/ai-insights",
                },
                {
                  title: "Outstanding payments",
                  value: data.business.outstandingCount,
                  desc: formatCurrency(data.business.outstandingPayments),
                  icon: <AlertTriangle className="h-5 w-5" />,
                  color: "#8B5CF6",
                  href: "/owner/billing",
                },
              ].map((insight) => (
                <Link
                  key={insight.title}
                  href={insight.href}
                  className="group rounded-2xl border border-[var(--border)] bg-gradient-to-br from-white to-[var(--surface-1)] p-5 transition-all duration-200 hover:border-[var(--brand-200)] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{insight.title}</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: insight.color }}>
                        {insight.value}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{insight.desc}</p>
                    </div>
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${insight.color}14`, color: insight.color }}
                    >
                      {insight.icon}
                    </div>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-600)] opacity-0 transition-opacity group-hover:opacity-100">
                    Review <ArrowUpRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
