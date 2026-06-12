import { requireRole } from "@/lib/auth/session";
import { getFranchiseOverview } from "@/lib/actions/franchise";
import { PageHeader, Card, StatCard, EmptyState } from "@/components/ui/card";
import { FranchiseSetupForm } from "@/components/owner/franchise-setup-form";
import { Building2, IndianRupee, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function FranchisePage() {
  const profile = await requireRole(["clinic_owner"]);
  const { group, branches, consolidated } = await getFranchiseOverview(profile.clinic_id!);

  return (
    <div>
      <PageHeader
        title="Franchise Management"
        subtitle="Consolidated view across all clinic branches"
      />

      {!group ? (
        <div className="max-w-lg">
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No franchise group yet"
            description="Create a franchise group to manage multiple branches and see consolidated analytics."
            action={<FranchiseSetupForm mode="create" />}
          />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{group.name}</h2>
              <p className="text-sm text-[var(--text-muted)]">{branches.length} branches</p>
            </div>
            <FranchiseSetupForm mode="link" />
          </div>

          {consolidated && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Consolidated Revenue (Month)" value={`₹${consolidated.totalRevenue.toLocaleString("en-IN")}`} icon={<IndianRupee className="h-5 w-5" />} />
              <StatCard label="Today (All Branches)" value={`₹${consolidated.todayRevenue.toLocaleString("en-IN")}`} icon={<IndianRupee className="h-5 w-5" />} />
              <StatCard label="Total Patients" value={consolidated.totalPatients} icon={<Users className="h-5 w-5" />} />
              <StatCard label="Waiting (All Branches)" value={consolidated.totalWaiting} icon={<Clock className="h-5 w-5" />} />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <Card key={branch.id} hover>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{branch.displayName}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{branch.city ?? branch.slug}</p>
                  </div>
                  <Badge variant={branch.status === "active" ? "success" : "warning"}>{branch.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[var(--text-muted)]">Month Revenue</p>
                    <p className="font-semibold">₹{branch.monthRevenue.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Patients</p>
                    <p className="font-semibold">{branch.patientCount}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Today</p>
                    <p className="font-semibold">₹{branch.todayRevenue.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Waiting</p>
                    <p className="font-semibold">{branch.patientsWaiting}</p>
                  </div>
                </div>
                {branch.id === profile.clinic_id && (
                  <p className="text-xs text-[var(--brand-600)] mt-3">Your primary branch</p>
                )}
              </Card>
            ))}
          </div>

          <Link href="/owner" className="text-sm text-[var(--brand-600)] hover:underline">
            ← Back to Executive Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
