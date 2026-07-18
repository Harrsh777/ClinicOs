export function ExecutiveDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 md:p-6">
      <div className="h-10 w-64 rounded-lg bg-[var(--surface-2)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-[var(--surface-2)]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-80 rounded-2xl bg-[var(--surface-2)] lg:col-span-2" />
        <div className="h-80 rounded-2xl bg-[var(--surface-2)]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-2xl bg-[var(--surface-2)]" />
        <div className="h-64 rounded-2xl bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}
