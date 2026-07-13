import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, Pill, MessageSquare, Stethoscope } from "lucide-react";
import type { PatientAIBrief } from "@/lib/engagement/types";

export function AIPatientBriefPanel({ brief }: { brief: PatientAIBrief }) {
  const hasAttention = brief.doctor_attention_items.length > 0;

  return (
    <Card className="!p-5 mb-6 border-2 border-[var(--brand-200)] bg-gradient-to-br from-[var(--brand-50)]/80 to-transparent">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-[var(--brand-500)]" />
        <h3 className="font-semibold">AI Patient Brief</h3>
        <Badge variant="brand">Gemini AI</Badge>
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">{brief.summary}</p>

      {hasAttention && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium mb-1">
            <AlertTriangle className="h-4 w-4" />
            Needs attention
          </div>
          <ul className="text-sm text-amber-900 space-y-1">
            {brief.doctor_attention_items.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <BriefItem
          icon={<Stethoscope className="h-4 w-4" />}
          label="Previous diagnosis"
          value={brief.previous_diagnosis}
        />
        <BriefItem
          icon={<MessageSquare className="h-4 w-4" />}
          label="Recovery progress"
          value={brief.recovery_progress}
        />
        <BriefItem
          icon={<Pill className="h-4 w-4" />}
          label="Current medications"
          value={brief.current_medications.join(", ") || "None"}
        />
        {brief.missed_follow_ups.length > 0 && (
          <BriefItem
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Missed follow-ups"
            value={brief.missed_follow_ups.join("; ")}
          />
        )}
      </div>

      {brief.patient_responses.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <h4 className="text-sm font-medium mb-2">Recent WhatsApp responses</h4>
          <div className="space-y-2">
            {brief.patient_responses.slice(0, 3).map((r, i) => (
              <div key={i} className="text-sm rounded-lg bg-[var(--surface-2)] px-3 py-2">
                <span className="text-[var(--text-muted)] text-xs">
                  {new Date(r.date).toLocaleDateString("en-IN")}
                  {r.priority ? ` · ${r.priority} priority` : ""}
                </span>
                <p className="mt-0.5">{r.response}</p>
                {r.recovery_status && (
                  <p className="text-xs text-[var(--brand-600)] mt-1">
                    Status: {r.recovery_status}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function BriefItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white/60 dark:bg-[var(--surface-1)] px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] mb-1">
        {icon}
        {label}
      </div>
      <p className="text-sm">{value}</p>
    </div>
  );
}
