import { requireRole } from "@/lib/auth/session";
import { getExpenses, getPLReport } from "@/lib/actions/accounting";
import { PageHeader, Card } from "@/components/ui/card";
import { ExpenseForm } from "@/components/accounting/expense-form";
import { PLReportView } from "@/components/accounting/pl-report";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function OwnerAccountingPage() {
  const profile = await requireRole(["clinic_owner", "finance_manager"]);
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const to = now.toISOString().split("T")[0];

  const [expenses, report] = await Promise.all([
    getExpenses(profile.clinic_id!, from, to),
    getPLReport(profile.clinic_id!, from, to),
  ]);

  return (
    <div>
      <PageHeader
        title="Accounting"
        subtitle="P&L, expenses, and financial reports"
        action={
          <Link href={`/api/export/pl?from=${from}&to=${to}`} target="_blank">
            <Button variant="secondary" size="sm">Export CSV</Button>
          </Link>
        }
      />

      <PLReportView report={report} from={from} to={to} />

      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <Card>
          <h3 className="font-semibold mb-4">Record Expense</h3>
          <ExpenseForm />
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Recent Expenses</h3>
          {expenses.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No expenses this month.</p>
          ) : (
            <div className="space-y-2">
              {expenses.slice(0, 10).map((e) => (
                <div key={e.id} className="flex justify-between text-sm py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <span className="font-medium capitalize">{e.category}</span>
                    <p className="text-xs text-[var(--text-muted)]">{e.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">₹{Number(e.amount).toLocaleString("en-IN")}</span>
                    <p className="text-xs text-[var(--text-muted)]">{e.expense_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
