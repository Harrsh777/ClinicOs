import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
      <table className={cn("clinic-table", className)}>{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={className}>{children}</tr>;
}

export function TableHead({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={className}>{children}</th>;
}

export function TableCell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={className}>{children}</td>;
}
